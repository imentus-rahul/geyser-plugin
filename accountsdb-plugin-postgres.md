The `solana-geyser-plugin-postgres` crate implements a plugin storing
account data to a PostgreSQL database to illustrate how a plugin can be
developed to work with Solana validators using the [Plugin Framework](https://docs.solana.com/developing/plugins/geyser_plugin).

### Configuration File Format

The plugin is configured using the input configuration file. An example
configuration file looks like the following:

```
{
	"libpath": "/solana/target/release/libsolana_geyser_plugin_postgres.so",
	"host": "postgres-server",
	"user": "solana",
	"port": 5433,
	"threads": 20,
	"batch_size": 20,
	"panic_on_db_errors": true,
	"accounts_selector" : {
		"accounts" : ["*"]
	}
}
```

The `host`, `user`, and `port` control the PostgreSQL configuration
information. For more advanced connection options, please use the
`connection_str` field. Please see [Rust Postgres Configuration](https://docs.rs/postgres/0.19.2/postgres/config/struct.Config.html).

To improve the throughput to the database, the plugin supports connection pooling
using multiple threads, each maintaining a connection to the PostgreSQL database.
The count of the threads is controlled by the `threads` field. A higher thread
count usually offers better performance.

To further improve performance when saving large numbers of accounts at
startup, the plugin uses bulk inserts. The batch size is controlled by the
`batch_size` parameter. This can help reduce the round trips to the database.

The `panic_on_db_errors` can be used to panic the validator in case of database
errors to ensure data consistency.

### Support Connection Using SSL

To connect to the PostgreSQL database via SSL, set `use_ssl` to true, and specify
the server certificate, the client certificate and the client key files in PEM format
using the `server_ca`, `client_cert` and `client_key` fields respectively.
For example:

```
    "use_ssl": true,
    "server_ca": "/solana/.ssh/server-ca.pem",
    "client_cert": "/solana/.ssh/client-cert.pem",
    "client_key": "/solana/.ssh/client-key.pem",
```

### Account Selection

The `accounts_selector` can be used to filter the accounts that should be persisted.

For example, one can use the following to persist only the accounts with particular
Base58-encoded Pubkeys,

```
    "accounts_selector" : {
         "accounts" : ["pubkey-1", "pubkey-2", ..., "pubkey-n"],
    }
```

Or use the following to select accounts with certain program owners:

```
    "accounts_selector" : {
         "owners" : ["pubkey-owner-1", "pubkey-owner-2", ..., "pubkey-owner-m"],
    }
```

To select all accounts, use the wildcard character (*):

```
    "accounts_selector" : {
         "accounts" : ["*"],
    }
```

### Transaction Selection

`transaction_selector`, controls if and what transactions to store.
If this field is missing, none of the transactions are stored.

For example, one can use the following to select only the transactions
referencing accounts with particular Base58-encoded Pubkeys,

```
"transaction_selector" : {
    "mentions" : \["pubkey-1", "pubkey-2", ..., "pubkey-n"\],
}
```

The `mentions` field supports wildcards to select all transaction or
all 'vote' transactions. For example, to select all transactions:

```
"transaction_selector" : {
    "mentions" : \["*"\],
}
```

To select all vote transactions:

```
"transaction_selector" : {
    "mentions" : \["all_votes"\],
}
```

### Database Setup

#### Install PostgreSQL Server

Please follow [PostgreSQL Ubuntu Installation](https://www.postgresql.org/download/linux/ubuntu/)
on instructions to install the PostgreSQL database server. For example, to
install postgresql-14,

```
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-14
```
#### Control the Database Access

Modify the pg_hba.conf as necessary to grant the plugin to access the database.
For example, in /etc/postgresql/14/main/pg_hba.conf, the following entry allows
nodes with IPs in the CIDR 10.138.0.0/24 to access all databases. The validator
runs in a node with an ip in the specified range.

```
host    all             all             10.138.0.0/24           trust
```

It is recommended to run the database server on a separate node from the validator for
better performance.

#### Configure the Database Performance Parameters

Please refer to the [PostgreSQL Server Configuration](https://www.postgresql.org/docs/14/runtime-config.html)
for configuration details. The referential implementation uses the following
configurations for better database performance in the /etc/postgresql/14/main/postgresql.conf
which are different from the default postgresql-14 installation.

```
max_connections = 200                  # (change requires restart)
shared_buffers = 1GB                   # min 128kB
effective_io_concurrency = 1000        # 1-1000; 0 disables prefetching
wal_level = minimal                    # minimal, replica, or logical
fsync = off                            # flush data to disk for crash safety
synchronous_commit = off               # synchronization level;
full_page_writes = off                 # recover from partial page writes
max_wal_senders = 0                    # max number of walsender processes
```

The sample scripts/postgresql.conf can be used for reference.

#### Create the Database Instance and the Role

Start the server:

```
sudo systemctl start postgresql@14-main
```

Create the database. For example, the following creates a database named 'solana':

```
sudo -u postgres createdb solana -p 5433
```

Create the database user. For example, the following creates a regular user named 'solana':

```
sudo -u postgres createuser -p 5433 solana
```

Verify the database is working using psql. For example, assuming the node running
PostgreSQL has the ip 10.138.0.9, the following command will land in a shell where
SQL commands can be entered:

```
psql -U solana -p 5433 -h 10.138.0.9 -w -d solana
psql -U solana -p 5432 -h localhost -w -d solana --password

```

#### Create the Schema Objects

Use the scripts/create_schema.sql

```
psql -U solana -p 5433 -h 10.138.0.9 -w -d solana -f scripts/create_schema.sql
```

After this, start the validator with the plugin by using the `--geyser-plugin-config`
argument mentioned above.

#### Destroy the Schema Objects

To destroy the database objects, created by `create_schema.sql`, use
drop_schema.sql. For example,

```
psql -U solana -p 5433 -h 10.138.0.9 -w -d solana -f scripts/drop_schema.sql
```

### Capture Historical Account Data

To capture account historical data, in the configuration file, turn
`store_account_historical_data` to true.

And ensure the database trigger is created to save data in the `audit_table` when
records in `account` are updated, as shown in `create_schema.sql`,

```
CREATE FUNCTION audit_account_update() RETURNS trigger AS $audit_account_update$
    BEGIN
		INSERT INTO account_audit (pubkey, owner, lamports, slot, executable, rent_epoch, data, write_version, updated_on)
            VALUES (OLD.pubkey, OLD.owner, OLD.lamports, OLD.slot,
                    OLD.executable, OLD.rent_epoch, OLD.data, OLD.write_version, OLD.updated_on);
        RETURN NEW;
    END;

$audit_account_update$ LANGUAGE plpgsql;

CREATE TRIGGER account_update_trigger AFTER UPDATE OR DELETE ON account
    FOR EACH ROW EXECUTE PROCEDURE audit_account_update();
```

The trigger can be dropped to disable this feature, for example,

```
DROP TRIGGER account_update_trigger ON account;
```

Over time, the account_audit can accumulate large amount of data. You may choose to
limit that by deleting older historical data.

For example, the following SQL statement can be used to keep up to 1000 of the most
recent records for an account:

```
delete from account_audit a2 where (pubkey, write_version) in
    (select pubkey, write_version from
        (select a.pubkey, a.updated_on, a.slot, a.write_version, a.lamports,
            rank() OVER ( partition by pubkey order by write_version desc) as rnk
            from account_audit a) ranked
            where ranked.rnk > 1000)
```

### Main Tables

The following are the tables in the Postgres database

| Table         | Description             |
|:--------------|:------------------------|
| account       | Account data            |
| block         | Block metadata          |
| slot          | Slot metadata           |
| transaction   | Transaction data        |
| account_audit | Account historical data |


### Performance Considerations

When a validator lacks sufficient compute power, the overhead of saving the
account data can cause it to fall behind the network especially when all
accounts or a large number of accounts are selected. The node hosting the
PostgreSQL database need to be powerful enough to handle the database loads
as well. It has been found using GCP n2-standard-64 machine type for the
validator and n2-highmem-32 for the PostgreSQL node is adequate for handling
transmiting all accounts while keeping up with the network. In addition, it is
best to keep the validator and the PostgreSQL in the same local network to
reduce latency. You may need to size the validator and database nodes
differently if serving other loads.



### Commands
```
--geyser-plugin-config /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json
```
```
The following is my validator run command:

cargo run --release --bin solana-validator -- --identity ~/validator-keypair.json --vote-account ~/vote-account-keypair.json --rpc-port 8899 --dynamic-port-range 8000-8100 --entrypoint mainnet-beta.solana.com:8001 --limit-ledger-size 50000000 --no-port-check --trusted-validator 7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2 --trusted-validator GdnSyH3YtwcxFvQrVVJMm1JhTS4QVX7MFsX56uJLUfiZ --no-check-vote-account --minimal-snapshot-download-speed 40000000 --maximum-snapshot-download-abort 20 --accounts-shrink-optimize-total-space true --accounts-shrink-ratio 0.8 --accountsdb-plugin-config /home/lijun_solana_com/plugin-config-all-txns-and-accounts-idx.json --ledger validator-ledger-mainnet

My plugin config:

{
"libpath": "/home/lijun_solana_com/solana-accountsdb-plugin-postgres-1/target/release/libsolana_accountsdb_plugin_postgres.so",
"host": "lijun-dev-2",
"user": "solana",
"port": 5433,
"threads": 80,
"batch_size": 20,
"panic_on_db_errors": true,
"store_account_historical_data": true,
"accounts_selector" : {
"accounts" : [""]
},
"transaction_selector": {
"mentions" : [""]
},
"index_token_owner": true,
"index_token_mint": true
}

My virtual machines configuration: I run in google GCP:

Validator: 64 CPU Intel(R) Xeon(R) CPU @ 2.80GHz, Memory: 384 G.

PostgreSQL: 48 CPU Intel(R) Xeon(R) CPU @ 2.80GHz, Memory: 384 G.
```



Read From here: 
- Build this repo https://github.com/solana-labs/solana-accountsdb-plugin-postgres.git for creation of ```target/release/libsolana_geyser_plugin_postgres.so```
```
cargo build --release
```
- Use another repo ```https://github.com/lijunwangs/solana-postgres-rpc-server.git```scripts to create schema and database
- Setup server and DB on pgadmin4
- create config file ```plugin-config.json``` with ```"connection_str": "postgres://solana:solana@localhost:5432/solana",```
- Run ```psql -U solana -p 5432 -h localhost -w -d solana --password ``` to setup connection with sql

- Build Solana Repo
- cargo build --release
- change file ```/multinode-demo/bootstrap-validator.sh```, add an argument here in L137 ```--geyser-plugin-config "/home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json"```
- run ```./multinode-demo/setup.sh```
- run ```./multinode-demo/bootstrap-validator.sh```




```
/multinode-demo/bootstrap-validator.sh: line 151: kill: (31276) - No such process
cargo  run   --bin solana-validator  --  --require-tower --ledger /home/imentus/Documents/im-client/solana/net/../config/bootstrap-validator --rpc-port 8899 --snapshot-interval-slots 200 --no-incremental-snapshots --identity /home/imentus/Documents/im-client/solana/net/../config/bootstrap-validator/identity.json --vote-account /home/imentus/Documents/im-client/solana/net/../config/bootstrap-validator/vote-account.json --rpc-faucet-address 127.0.0.1:9900 --no-poh-speed-test --no-os-network-limits-test --no-wait-for-vote-to-start-leader --full-rpc-api --geyser-plugin-config /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json --gossip-port 8001 --log -
```


GruSFAjP7gtmJ9k3SBAiCrMXyUByGJKR885MhKWM9KJD
```
solana-test-validator --geyser-plugin-config /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json
```

```
SELECT * FROM "block"

SELECT COUNT(*) FROM "block"

SELECT * FROM "slot"

SELECT COUNT(*) FROM "slot"

DELETE FROM "account"
DELETE FROM "account_audit"
DELETE FROM "block"
DELETE FROM "slot"
DELETE FROM "spl_token_mint_index"
DELETE FROM "spl_token_owner_index"
DELETE FROM "transaction"
```

```
SELECT * FROM "block"

SELECT COUNT(*) FROM "block"

SELECT * FROM "slot"

SELECT COUNT(*) FROM "block"
SELECT COUNT(*) FROM "slot"
SELECT COUNT(*) FROM "account"
SELECT * FROM "account"
SELECT COUNT(*) FROM "transaction"
SELECT * FROM "transaction"

delete * from account_audit a2 where (pubkey, write_version) in
    (select pubkey, write_version from
        (select a.pubkey, a.updated_on, a.slot, a.write_version, a.lamports,
            rank() OVER ( partition by pubkey order by write_version desc) as rnk
            from account_audit a) ranked
            where ranked.rnk > 1000)

```

```
solana-test-validator \
--bpf-program \
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  /home/imentus/Documents/im-client/metaplex-program-library/token-metadata/target/deploy/mpl_token_metadata.so
```

solana-test-validator --quiet \
  -C \
  /tmp/amman-config.12e810468d1046533fc42c5e75229db7a3ead84018bf71b4885e5151949244b9.yml \
  --ledger \
  /tmp/amman-ledger \
  -r \
  --bpf-program \
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  /home/imentus/Documents/im-client/metaplex-program-library/token-metadata/target/deploy/mpl_token_metadata.so \
  --limit-ledger-size \
  10000 \
  --geyser-plugin-config \
  /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json

  ```
  solana-test-validator \
    --geyser-plugin-config \
  /home/imentus/Documents/im-client/solana-accountsdb-plugin-postgres/plugin-config.json \
--bpf-program \
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  /home/imentus/Documents/im-client/metaplex-program-library/token-metadata/target/deploy/mpl_token_metadata.so
```

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
	"accounts_selector": {
		"accounts": [
			"GruSFAjP7gtmJ9k3SBAiCrMXyUByGJKR885MhKWM9KJD"
		]
	},
	"transaction_selector": {
		"mentions": [
			"GruSFAjP7gtmJ9k3SBAiCrMXyUByGJKR885MhKWM9KJD",
			"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
		]
	},
	"store_account_historical_data": true,
	"index_token_owner": true,
	"index_token_mint": true
}

```
- delall.sh

```
#!/usr/bin/env bash
# sudo kill -9 $(sudo lsof -t -i:5432)
sudo -u postgres psql --command "DROP DATABASE solana;"
sudo -u postgres psql --command "DROP ROLE solana;"
```
- rerun.sh
```
#!/usr/bin/env bash
rsudo /etc/init.d/postgresql start
sudo -u postgres psql --command "CREATE USER solana WITH SUPERUSER PASSWORD 'solana';"
sudo -u postgres createdb -O solana solana
PGPASSWORD=solana psql -U solana -p 5432 -h localhost -w -d solana -f scripts/create_schema.sql
```
