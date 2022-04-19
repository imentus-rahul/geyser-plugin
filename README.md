### README

### Main Repositories to look at:
- https://github.com/solana-labs/solana-accountsdb-plugin-postgres: Setting up geyser plugin
- https://github.com/solana-labs/solana.git: For creation of Solana validator

### Commands to Follow:
- git clone https://github.com/solana-labs/solana-accountsdb-plugin-postgres
- `source ci/rust-version.sh all` or `./ci/rust-version.sh all`
- `./ci/install-build-deps.sh` It will install postgres and creates a DB `solana`
- Make sure nothing is running at Port 5432 already
- `./ci/start_postgres.sh` It will start postgres at 5432 and creates schema using `scripts/create_schema.sql`
- `cargo build --release` and search for this file `libsolana_geyser_plugin_postgres.so` in target/release/libsolana_geyser_plugin_postgres.so; Copy file path
- Create plugin config as below, name it `plugin-config.json` and save it at root of repo, change `libpath` below in json as per full file path copied above.
```
{
	"libpath": "/home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/target/release/libsolana_geyser_plugin_postgres.so",
	"host": "localhost",
	"user": "solana",
	"connection_str": "postgres://solana:solana@localhost:5432/solana",
	"port": 5432,
	"threads": 20, 
	"batch_size": 20,
	"panic_on_db_errors": true,
	"accounts_selector" : {
		"accounts" : ["*"]
	},
	"transaction_selector" : {
		"mentions" : ["*"]
	}
}
```
- Update Solana to latest version: `sh -c "$(curl -sSfL https://release.solana.com/v1.10.8/install)"`
- Finally to start the local validator: `solana-test-validator --geyser-plugin-config /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json`
- Once local validator with plugin spins up, create some transaction and check the same in DB using pgadmin4.

### Other commands that we'll use when we use solana repo (Currently of no use)
- Build Solana Repo `https://github.com/solana-labs/solana.git` using `cargo build --release`
- change file ```/multinode-demo/bootstrap-validator.sh```, add an argument here in L137 ```--geyser-plugin-config "/home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json"```
- run `./multinode-demo/setup.sh`
- run `./multinode-demo/bootstrap-validator.sh` //This currently cannot make a connection with postgres
- run `./multinode-demo/faucet.sh`

or

```
cargo  run   --bin solana-validator  --  --require-tower --ledger /home/imentus/Documents/im-client/solana/net/../config/bootstrap-validator --rpc-port 8899 --snapshot-interval-slots 200 --no-incremental-snapshots --identity /home/imentus/Documents/im-client/solana/net/../config/bootstrap-validator/identity.json --vote-account /home/imentus/Documents/im-client/solana/net/../config/bootstrap-validator/vote-account.json --rpc-faucet-address 127.0.0.1:9900 --no-poh-speed-test --no-os-network-limits-test --no-wait-for-vote-to-start-leader --full-rpc-api --geyser-plugin-config /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json --gossip-port 8001 --log -
```
