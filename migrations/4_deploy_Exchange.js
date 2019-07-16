const Exchange = artifacts.require('./third-party/Exchange');

module.exports = function (deployer) {
  deployer.deploy(Exchange);
};
