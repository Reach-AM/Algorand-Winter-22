async function run(runtimeEnv, deployer) {
    const master = deployer.accountsByName.get('master');

    await deployer.deployASA('acsCoinASA', {
        creator: master,
        totalFee: 1000,
        validRounds: 1002
    });
}

module.exports = { default: run };
