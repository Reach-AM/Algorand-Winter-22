from pyteal import *

def mint_approval():

    handle_creation = Seq(
        App.globalPut(Bytes("TeslaCoinID"), Int(0)), # Check if asset has been created
        App.globalPut(Bytes("HoldingsAddr"), Bytes("")), # Check if holdings has been deployed
        App.globalPut(Bytes("BurnAddr"), Bytes("")), # Check if holdings has been deployed
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
    
    minting = Seq(
        securityCheck(Int(1),Int(1)), # Basic Security Checks
        Assert(Txn.sender() == Global.creator_address()), # Creator only
        Assert(App.globalGet(Bytes("TeslaCoinID")) == Int(0)), # Prevent double asset creation

        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum: TxnType.AssetConfig,
            TxnField.config_asset_total: Int(1000000),
            TxnField.config_asset_decimals: Int(0),
            TxnField.config_asset_name: Bytes("Tesla"),
            TxnField.config_asset_unit_name: Bytes("TSLA")
        }),
        InnerTxnBuilder.Submit(),

        App.globalPut(Bytes("TeslaCoinID"), InnerTxn.created_asset_id()),
        Approve()
    )

    currentBalance = AssetHolding.balance(Global.current_application_address(), Txn.assets[0])
    @Subroutine(TealType.none)
    def sendAsset(amount):
        return( Seq(
            securityCheck(Int(1),Int(2)), # Basic Security Checks
            Assert(Txn.sender() == Global.creator_address()), # Creator only
            currentBalance,
            Assert(App.globalGet(Bytes("TeslaCoinID")) == Txn.assets[0]), # Asset ID verification with global state.
            Assert(And(Int(0) < amountTransfer, # Sent Assets must be > 0
                amountTransfer <= currentBalance.value())), # Enough supply to conduct the transfer

            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.asset_receiver: Txn.accounts[1],
                TxnField.asset_amount: amount,
                TxnField.xfer_asset: Txn.assets[0]
            }),
            InnerTxnBuilder.Submit()
    ))

    amountTransfer = Btoi(Txn.application_args[1])
    transfer = Seq(
        Assert(App.globalGet(Bytes("HoldingsAddr")) == Txn.accounts[1]),
        sendAsset(amountTransfer),
        Approve()
    )

    burn = Seq(
        Assert(App.globalGet(Bytes("BurnAddr")) == Txn.accounts[1]),
        sendAsset(amountTransfer),
        Approve()
    )

    setaccount = Seq(
        securityCheck(Int(1),Int(2)), # Basic Security Checks
        Assert(Txn.sender() == Global.creator_address()), # Creator only
        Cond(
            [Txn.application_args[1] == Bytes("Holdings"), App.globalPut(Bytes("HoldingsAddr"), Txn.accounts[1])],
            [Txn.application_args[1] == Bytes("Burn"), App.globalPut(Bytes("BurnAddr"), Txn.accounts[1])]
        ),
        Approve()
    )

    handle_noop = Seq(
        Assert(Txn.sender() == Global.creator_address()), # Creator only
        Cond(
            [Txn.application_args[0] == Bytes("Mint"), minting], # Create TESLA asset via app call
            [Txn.application_args[0] == Bytes("Transfer"), transfer], # Transfer TESLA asset via app call
            [Txn.application_args[0] == Bytes("Burn"), burn], # Burn TESLA asset via app call
            [Txn.application_args[0] == Bytes("SetAccount"), setaccount]# Set Hold/Burn addresses
        )
    )

    handle_optin = Seq(
        securityCheck(Int(1),Int(1)), # Basic Security Checks
        Assert(App.optedIn(Txn.sender(), Txn.application_id())), # Assert not opted in before
        Return(Txn.sender() == Global.creator_address())
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
    print(compileTeal(mint_approval(), mode=Mode.Application, version=6))