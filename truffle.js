require('dotenv').config();
const MNEMONIC = process.env.MNEMONIC_PHRASE;
const INFURA_PROJECT_ID = process.env.INFURA_PROJECT_ID;
const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 6000000,
    },
    test: {
      host: 'localhost',
      port: 8545,
      network_id: '1337',
      gas: 6000000,
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8545,
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01, // <-- Use this low gas price
    },
    localBlockchain: {
      host: 'localhost',
      port: 20010,
      network_id: '*', // Match any network id
    },
    ganachecli: {
      host: process.env.GANACHE,
      port: process.env.GANACHE_PORT || 8545,
      network_id: '*', // Match any network id
    },
    rinkeby: {
      provider: () => new HDWalletProvider(MNEMONIC, `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`, 1),
      network_id: 4,
      gas: 4700000,
    },
  },
  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 21,
    },
  },
};
