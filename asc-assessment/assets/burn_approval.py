from pyteal import *

def burn_approval():

    assetID = Txn.assets[0]
    handle_creation = Seq(
        App.globalPut(Bytes("TeslaCoinID"), assetID),
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

    handle_noop = Seq(
        securityCheck(Int(1),Int(1)), # Basic Security Checks
        Assert(Txn.sender() == Global.creator_address()), # Creator only
        Cond(
            [Txn.application_args[0] == Bytes("AssetOptIn"), assetoptin]
        )
    )

    handle_optin = Seq(
        Reject()
    )

    handle_deleteapp = Seq(
        securityCheck(Int(1),Int(0)),
        Return(Txn.sender() == Global.creator_address())
    )
    
    handle_updateapp = Seq(
        securityCheck(Int(1),Int(0)),
        Reject()
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
    print(compileTeal(burn_approval(), mode=Mode.Application, version=6))