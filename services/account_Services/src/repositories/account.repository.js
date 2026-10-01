import prisma from "../db/db.js";

function client(tx){
    return tx || prisma;
}

export async function create({ownerName,balanceCents},tx){
    return prisma.account.create({
        data :{
            ownerName,
            balanceCents
        }
    })
}

export async function findById(id,tx){
    return client(tx).findById({where : {id}})
}

export async function findAll({limit = 50,offset = 0},tx){
    return client(tx).account.findMany({
        orderBy : {createdAt : "desc"},
        skip : offset,
        take : limit
    })
}

export async function lockForUpdate(id,tx){
    const rows = await tx.$queryRaw`
    SELECT id,owner_name,balance_cents,version,status
    FROM account WHERE id = ${id} :: uuid FOR UPDATE`;

    const row = rows[0]
    if(!row) return null
    return{
        id:row.id,
        ownerName:row.owner_name,
        balanceCents:row.balance_cents,
        version:row.version,
        status:row.status
    }
}

export async function adjustBalance(id,deltaCents,tx){
    return client(tx).account.update({
        where: {id},
        data:{
        balnceCents: {increment : deltaCents},
        version: {increment : 1}
        },
    })
}

export async function adjustBalanceOptimistic(id,deltaCents,expectedVersion,tx){
    const result = await client(tx).account.updateMany({
        where : {id,version:expectedVersion},
        data:{
            balanceCents : {increment : deltaCents},
            version : {increment : 1}
        }
    })

    if(result.count === 0){
        return client(tx).account.findUnique({where : {id}})
    }
}