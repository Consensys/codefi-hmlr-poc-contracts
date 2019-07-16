const FakeDai = artifacts.require('./mocks/DSToken');

module.exports = function (deployer) {
  let daiInstance;
  deployer.deploy(FakeDai, 'DAI')
    .then((instance) => {
      daiInstance = instance;
      daiInstance.mint(
        1000000000000000000000000000,
      )
        .then((tx) => {
          daiInstance.setName('Dai');
        });
    });
};
