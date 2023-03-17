/* eslint-disable */
import algosdk from "algosdk";

const sendAlgoSignerTransaction = async (txns, algodClient) => {
    const AlgoSigner = window.AlgoSigner;

    if (typeof AlgoSigner !== "undefined") {
        try {
            // Assign a Group ID to the transactions using the SDK
            algosdk.assignGroupID(txns);

            // Get the binaries and base64 encode them
            let binaryTxns = txns.map((txn) => txn.toByte());
            let base64Txns = binaryTxns.map((binary) => ({txn: AlgoSigner.encoding.msgpackToBase64(binary),}));
            let signedTxns = await AlgoSigner.signTxn(base64Txns);

            // Get the base64 encoded signed transaction and convert it to binary
            let binarySignedTxns = signedTxns.map((txn) => AlgoSigner.encoding.base64ToMsgpack(txn.blob));

            const response = await algodClient
                .sendRawTransaction(binarySignedTxns)
                .do();
            console.log(response);

            return response;
        } catch (err) {
            console.error(err);
        }
    }
};

export default {
    sendAlgoSignerTransaction
};
