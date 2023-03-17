const { executeTransaction } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");
const algosdk = require("algosdk");

async function run(runtimeEnv, deployer) {
    const master = deployer.accountsByName.get('master');
    const buyer = deployer.accountsByName.get('buyer');
    const acsAsset = deployer.asa.get('acsCoinASA');

    // retrieve asset ID
    const assetId = acsAsset.assetIndex;

    // asset opt in
    await executeTransaction(deployer, {
        type: types.TransactionType.OptInASA,
        sign: types.SignType.SecretKey,
        fromAccount: buyer,
        assetID: assetId,
        payFlags: { totalFee: 1000 },
    });

    // transfer asset
    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAsset,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: buyer.addr,
        amount: 100,
        assetID: assetId,
        payFlags: { totalFee: 1000 },
    });

    const receiverAcc = await deployer.algodClient.accountInformation(buyer.addr).do();
    console.log(receiverAcc.assets);
}

module.exports = { default: run };