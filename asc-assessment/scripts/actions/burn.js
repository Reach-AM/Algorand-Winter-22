const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    const master = deployer.accountsByName.get("master");
    const mintApprovalFile = "mint_approval.py";
    const mintClearStateFile = "mint_clearstate.py";
    const burnApprovalFile = "burn_approval.py";
    const burnClearStateFile = "burn_clearstate.py";

    // Get Apps to call Burn Transaction

    const mintApp = deployer.getApp(mintApprovalFile, mintClearStateFile);
    const mintID = mintApp.appID;
    const burnApp = deployer.getApp(burnApprovalFile, burnClearStateFile);
    const burnAddr = burnApp.applicationAccount;

    let assetID = (await readAppGlobalState(deployer, master.addr, mintID)).get("TeslaCoinID");

    // Burn App Call

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintID,
        appArgs: [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(1000)],
        accounts: [burnAddr],
        foreignAssets: [assetID],
        payFlags: { totalFee: 1000 }
    });

    /*
    let burnAccount = await deployer.algodClient.accountInformation(burnAddr).do();
    console.log(burnAccount);
    */
}

module.exports = { default: run };
