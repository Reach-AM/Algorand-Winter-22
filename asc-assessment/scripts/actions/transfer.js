const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    const master = deployer.accountsByName.get("master");
    const mintApprovalFile = "mint_approval.py";
    const mintClearStateFile = "mint_clearstate.py";
    const holdApprovalFile = "holdings_approval.py";
    const holdClearStateFile = "holdings_clearstate.py";


    // Get Apps to call Transfer Transaction
    
    const mintApp = deployer.getApp(mintApprovalFile, mintClearStateFile);
    const mintID = mintApp.appID;
    const holdingsApp = deployer.getApp(holdApprovalFile, holdClearStateFile);
    const holdingsAddr = holdingsApp.applicationAccount;

    let assetID = (await readAppGlobalState(deployer, master.addr, mintID)).get("TeslaCoinID");

    // Transfer App Call

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintID,
        appArgs: [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(1000)],
        accounts: [holdingsAddr],
        foreignAssets: [assetID],
        payFlags: { totalFee: 1000 }
    });
    
    /*
    let holdingsAccount = await deployer.algodClient.accountInformation(holdingsAddr).do();
    console.log(holdingsAccount);
    */
}

module.exports = { default: run };
