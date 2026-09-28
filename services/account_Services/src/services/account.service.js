import prisma from "../db/db.js";
import { AppError } from "../middleware/errorHandler.js";
import * as accountsRepo from "../repositories/account.repository.js";
import { isRetryableTxError } from "../utils/dbError.js";

export async function createAccount({ownerName, balanceCents}){
    if(!ownerName || typeof ownerName !== "string"){
        throw new AppError("ownerName is required",400);
    }
    if(balanceCents === undefined || typeof balanceCents !== "number" || balanceCents < 0){
        throw new AppError("balanceCents must be a non-negative integer",400);
    }
    return accountsRepo.create({ownerName, balanceCents})
}

export async function getAccount(id){
    if(!id || typeof id !== "string"){
        throw new AppError("id is required",400);
    }
    const account = await accountsRepo.findById(id);
    if(!account) throw new AppError("Account not found",404)
}

export async function listAccount(query){
    const limit = Math.min(parseInt(query.limit,10) || 50,200)
    const offset = parseInt(query.offset,10) || 0
    return accountsRepo.findAll({limit,offset})
}

export async function transferFunds({fromAccountId,toAccountId,amountCents}){
    if(fromAccountId === toAccountId){
        throw new AppError("fromAccountId and toAccountId must be different",400);
    }

    if(!amountCents || typeof amountCents !== "number" || amountCents <= 0){
        throw new AppError("amountCents must be a positive integer",400);
    }
    const MAX_RETRIES = 3;
    let attempt = 0;

    while(attempt < MAX_RETRIES){
        try{
            return await prisma.$transaction(
                async(tx) => {
                    //lock ordering  to prevent deadlocks : always lock the account with the smaller ID first with uuid and if numeric from account id and to account id is ther then sort them numerically
                    const [firstId, secondId] = [fromAccountId, toAccountId].sort();
                    await accountsRepo.lockForUpdate(firstId,tx)
                    await accountsRepo.lockForUpdate(secondId,tx)


                    const fromAccount = await accountsRepo.findbyId(fromAccountId,tx);
                    const toAccount = await accountsRepo.findbyId(toAccountId,tx);

                    if(!fromAccount) throw new AppError(`Source account ${fromAccountId} not found`,404);
                    if(!toAccount) throw new AppError(`Destination account ${toAccountId} not found`,404);

                    if(fromAccount.balanceCents < amountCents){
                        throw new AppError(`Insufficient funds in account ${fromAccountId}`,422);
                    }

                    await accountsRepo.adjustBalance(fromAccountId,-amountCents,tx);
                    await accountsRepo.adjustBalance(toAccountId,amountCents,tx);


                    return {fromAccountId,toAccountId,amountCents,status:"success"}
                },
                { islolationLevel: "Serializable" } // Ensures strict transaction isolation
            )
        }catch(error){
            const isSerializationError = isRetryableTxError(error);
             // Prisma specific serialization error codes
            if(isSerializationError && attempt < MAX_RETRIES){
                attempt++;
                console.warn(`Transaction serialization error, retrying attempt ${attempt}...`);
                continue; // Retry the transaction
            }
            throw error; // Rethrow other errors
        }
    }
}


//called by transfer service to adjust balance of a single account (for debit or credit)(SAGA pattern) - this is not a public endpoint, only for internal use by transfer service
export async function adjustSingleAccount({accountId,deltaCents}){
    return prisma.$transaction(async(tx)=>{
        const account = await accountsRepo.lockforUpdate(accountId,tx);
        if(!account) throw new AppError(`Account ${accountId} not found`,404);
        if(account.balanceCents + deltaCents < 0){
            throw new AppError('Adjustment would result in negative balance',422);
        }
        return accountsRepo.adjustBalance(accountId,deltaCents,tx)
    })
}