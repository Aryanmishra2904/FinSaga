function asyncHandler(fn){
    return (req,res,next) =>{
        fn(req,res,next).catch(next)
    }
}

export const createAccount = asyncHandler(async(req,res)=>{
    const {ownerName, balanceCents} = req.body;
    const account = await accountService.createAccount({ownerName, balanceCents});
    res.status(201).json(account);
});

export const listAccount = asyncHandler(async(req,res)=>{
    const accounts = await accountService.listAccounts(req.query);
    res.status(200).json(accounts);
});

export const getAccount = asyncHandler(async(req,res)=>{
    const account = await accountService.getAccount(req.params.id);
    res.status(200).json(account);
});

// Direct synchronous transfer endpoint. In the full saga design, Transfer Service
// is normally the one calling this internally (or triggering it via an event) -
// this endpoint stays for local testing (e.g. from the CLI) without a full saga.
export const transferFunds = asyncHandler(async (req, res) => {
  const { fromAccountId, toAccountId, amountCents } = req.body;
  const result = await accountsService.transferFunds({ fromAccountId, toAccountId, amountCents });
  res.status(200).json(result);
});
 
// Internal endpoint used by Transfer Service's saga to apply a single-sided
// debit/credit (e.g. compensating reversal). Not intended for public clients -
// the Gateway should not route this path externally.
export const adjustBalance = asyncHandler(async (req, res) => {
  const { deltaCents } = req.body;
  const account = await accountsService.adjustSingleAccount({
    accountId: req.params.id,
    deltaCents,
  });
  res.status(200).json(account);
});
