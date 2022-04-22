#!/usr/bin/env bash
pkill solana-test-validator
rm -rf test-ledger
rm -rf config
./multinode-demo/setup.sh
./multinode-demo/bootstrap-validator.sh
./multinode-demo/faucet.sh > /dev/null &

solana-test-validator --help

solana-test-validator \
--geyser-plugin-config \
/home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json \
--bpf-program \
metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
/home/imentus/Documents/im-client/metaplex-program-library/token-metadata/target/deploy/mpl_token_metadata.so

./target/debug/solana-validator --help
