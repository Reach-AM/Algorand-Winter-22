const { executeTransaction, convert, readAppGlobalState } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

async function run(runtimeEnv, deployer) {
    const master = deployer.accountsByName.get("master");
    const holdApprovalFile = "holdings_approval.py";
    const holdClearStateFile = "holdings_clearstate.py";

    // Get App to call Update App Transaction

    const holdingsApp = deployer.getApp(holdApprovalFile, holdClearStateFile);
    const holdingsID = holdingsApp.appID;

    // Update Price App Call

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: holdingsID,
        appArgs: [convert.stringToBytes("UpdatePrice"), convert.uint64ToBigEndian(6000000)],
        payFlags: { totalFee: 1000 }
    });

    /*
    let price = (await readAppGlobalState(deployer, master.addr, holdingsID)).get("Price");
    console.log("Current price: ", price)
    */
}

module.exports = { default: run };
