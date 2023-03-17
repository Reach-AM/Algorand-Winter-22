from pyteal import *

def holdings_approval():
    
    assetID = Txn.assets[0]
    handle_creation = Seq(
        App.globalPut(Bytes("TeslaCoinID"), assetID),
        App.globalPut(Bytes("Price"),  Int(5000000)), # price in microAlgos
        Approve()
    )

    @Subroutine(TealType.none)
    def securityCheck(group, args):
        return( Seq(
            Assert(Txn.rekey_to() == Global.zero_address()), # rekey to
            Assert(Txn.close_remainder_to() == Global.zero_address()), # close reminder to
            Assert(Txn.asset_close_to() == Global.zero_address()), # asset close to
            Assert(Global.group_size() == group), # group size
            Assert(Txn.application_args.length() == args) # args in transaction
    ))
    
    hasOptIn = AssetHolding.balance(Global.current_application_address(), Txn.assets[0])
    assetoptin = Seq(
        securityCheck(Int(1),Int(1)), # Basic Security Checks
        Assert(Txn.sender() == Global.creator_address()), # Creator only
        Assert(App.globalGet(Bytes("TeslaCoinID")) == Txn.assets[0]), # Asset ID verification with global state
        hasOptIn,
        Assert(hasOptIn.hasValue() == Int(0)), # Check if Asset has not been opted in before
        
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Global.current_application_address(),
            TxnField.asset_amount: Int(0),
            TxnField.xfer_asset: Txn.assets[0],
        }),
        InnerTxnBuilder.Submit(),

        Approve()
    )

    currentBalance = AssetHolding.balance(Global.current_application_address(), Txn.assets[0])
    amountSell = Btoi(Txn.application_args[1])
    selltockens = Seq(
        securityCheck(Int(2),Int(2)), # Basic Security Checks
        Assert(Gtxn[0].type_enum() == TxnType.Payment), # Check first payment transaction
        Assert(Gtxn[1].type_enum() == TxnType.ApplicationCall),
        Assert(Gtxn[0].amount() == Add(Mul(App.globalGet(Bytes("Price")),amountSell),Int(1000))), # Check payment ammount
        Assert(Gtxn[0].receiver() == Global.current_application_address()), # Check payment receiver
        Assert(App.globalGet(Bytes("TeslaCoinID")) == Txn.assets[0]), # Asset ID verification with global state
        currentBalance,
        Assert(And(Int(0) < amountSell, amountSell < Int(1000), # Sent Assets must be 0 < ammountSell < 1000
            amountSell <= currentBalance.value())), # Enough supply to conduct the transfer

        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetTransfer,
            TxnField.asset_receiver: Txn.sender(),
            TxnField.asset_amount: amountSell,
            TxnField.xfer_asset: Txn.assets[0]
        }),
        InnerTxnBuilder.Submit(),
        
        Approve()
    )

    newPrice = Btoi(Txn.application_args[1])
    updateprice= Seq(
        securityCheck(Int(1),Int(2)), # Basic Security Checks
        Assert(Txn.sender() == Global.creator_address()), # Creator only
        App.globalPut(Bytes("Price"),  newPrice),
        Approve()
    )

    handle_noop = Seq(
        Cond(
            [Txn.application_args[0] == Bytes("AssetOptIn"), assetoptin],
            [Txn.application_args[0] == Bytes("SellTokens"), selltockens],
            [Txn.application_args[0] == Bytes("UpdatePrice"), updateprice]
        )
    )

    handle_optin = Seq(
        securityCheck(Int(1),Int(0)),
        Assert(App.optedIn(Txn.sender(), Txn.application_id())),
        Approve()
    )

    handle_deleteapp = Seq(
        securityCheck(Int(1),Int(0)),
        Return(Txn.sender() == Global.creator_address())
    )
    
    handle_updateapp = Seq(
        securityCheck(Int(1),Int(0)),
        Return(Txn.sender() == Global.creator_address())
    )

    handle_closeout = Seq(
        securityCheck(Int(1),Int(0)),
        Approve()
    )
    
    program = Cond(
        [Txn.application_id() == Int(0), handle_creation],
        [Txn.on_completion() == OnComplete.NoOp, handle_noop],
        [Txn.on_completion() == OnComplete.OptIn, handle_optin],
        [Txn.on_completion() == OnComplete.DeleteApplication, handle_deleteapp],
        [Txn.on_completion() == OnComplete.UpdateApplication, handle_updateapp],
        [Txn.on_completion() == OnComplete.CloseOut, handle_closeout]
    )

    return program

if __name__ == "__main__":
    print(compileTeal(holdings_approval(), mode=Mode.Application, version=6))