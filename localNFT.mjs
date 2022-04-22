import {
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
    Connection,
    Keypair,
    Transaction,
  } from '@solana/web3.js';
  // import * as web3 from '@solana/web3.js'
  import base58 from 'bs58';
  import { serialize, BinaryReader, BinaryWriter } from 'borsh';
  import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
  // import * as splToken from '@solana/spl-token';
  import BN from 'bn.js';
  
  // import { actions } from '@metaplex/js';
  // import { SignMetadata } from "@metaplex-foundation/mpl-token-metadata";
  // import axios from 'axios';
  
  import fs from 'fs';
  
  import dotenv from 'dotenv';
  dotenv.config();
  
  // import {
  //   CreateMetadata,
  //   CreateMasterEditionV3,
  //   CreateMetadataV2,
  //   DataV2,
  //   MasterEdition,
  //   Metadata,
  //   MetadataDataData,
  // } from "@metaplex-foundation/mpl-token-metadata";
  
  export const METADATA_PREFIX = 'metadata';
  export const EDITION = 'edition';
  
  export const TOKEN_PROGRAM_ID = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  );
  
  export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  );
  
  export const METADATA_PROGRAM_ID =
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  
  export const extendBorsh = () => {
    (BinaryReader.prototype).readPubkey = function () {
      const reader = this;
      const array = reader.readFixedArray(32);
      return new PublicKey(array);
    };
  
    (BinaryWriter.prototype).writePubkey = function (value) {
      const writer = this;
      writer.writeFixedArray(value.toBuffer());
    };
  
    (BinaryReader.prototype).readPubkeyAsString = function () {
      const reader = this;
      const array = reader.readFixedArray(32);
      return base58.encode(array);
    };
  
    (BinaryWriter.prototype).writePubkeyAsString = function (
      value,
    ) {
      const writer = this;
      writer.writeFixedArray(base58.decode(value));
    };
  };
  
  extendBorsh();
  
  
  // creating SPL Token
  // Step 1: create uninitialized mint
  export function createUninitializedMint(
    instructions,
    payer,
    amount,
    signers,
  ) {
    // SPL Token address
    const account = Keypair.generate();
    console.log("SPL Token account: ", account.publicKey.toBase58());
  
    let data = account.secretKey.toString('base64');
    data = "[" + data + "]";
  
  
    // incase of multiple tokens need to rename adding with 'i' value
    fs.writeFile('spltoken.json', data, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    })
  
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: account.publicKey,
        lamports: amount,
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID,
      }),
    );
  
    signers.push(account);
  
    return account.publicKey; // return spl token publicKey address
  }
  // Step 2: create initialized mint
  export function createMint(
    instructions,
    payer,
    mintRentExempt,
    decimals,
    owner,
    freezeAuthority,
    signers,
  ) {
    const account = createUninitializedMint(
      instructions,
      payer,
      mintRentExempt,
      signers,
    );
    console.log("account from createUninitializedMint: ", account.toBase58());
  
    // static createInitMintInstruction(
    //   programId: PublicKey,
    //   mint: PublicKey,
    //   decimals: number,
    //   mintAuthority: PublicKey,
    //   freezeAuthority: PublicKey | null,
    // ): TransactionInstruction;
  
    instructions.push(
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        account,
        decimals,
        owner,
        freezeAuthority,
      ),
    );
  
    return account;
  }
  
  // Step 3: create/initialize ATA from SPL Token on top of blockchain
  // static createAssociatedTokenAccountInstruction(
  //   associatedProgramId: PublicKey,
  //   programId: PublicKey,
  //   mint: PublicKey,
  //   associatedAccount: PublicKey,
  //   owner: PublicKey,
  //   payer: PublicKey,
  // ): TransactionInstruction;
  export function createAssociatedTokenAccountInstruction(
    instructions,
    associatedTokenAddress,
    payer,
    walletAddress, // Assume this wallet address == address that holds associatedTokenAddress
    splTokenMintAddress,
  ) {
    const keys = [
      {
        pubkey: payer,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: associatedTokenAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: walletAddress,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: splTokenMintAddress,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        data: Buffer.from([]),
      }),
    );
  }
  
  // Step 4: create/initialize Metadata Account on top of blockchain
  // Program log: (Deprecated as of 1.1.0, please use V3 Create Master Edition) V2 Create Master Edition
  //CreateMetadataV2Args
  class CreateMetadataV2Args {
    instruction = 16;
    data;
    isMutable;
    constructor(args) {
      this.data = args.data;
      this.isMutable = args.isMutable;
    }
  
  }
  // Reference: 
  // const data = CreateMetadataV2Args.serialize({
  //   data: metadataData,
  //   isMutable: true,
  // });
  
  //Reference: 
  // export class CreateMetadataV2Args extends Borsh.Data<{ data: DataV2; isMutable: boolean }> {
  //   static readonly SCHEMA = new Map([
  //     ...DataV2.SCHEMA,
  //     ...CreateMetadataV2Args.struct([
  //       ['instruction', 'u8'],
  //       ['data', DataV2],
  //       ['isMutable', 'u8'],
  //     ]),
  //   ]);
  
  //   instruction = 16;
  //   data: DataV2;
  //   isMutable: boolean;
  // }
  
  class CreateMetadataArgs {
    instruction = 0;
    data;
    isMutable;
  
    constructor(args) {
      this.data = args.data;
      this.isMutable = args.isMutable;
    }
  }
  
  // UpdateMetadataV2Args: need to check
  class UpdateMetadataV2Args {
    instruction = 15;
    data;
    updateAuthority;
    primarySaleHappened;
    isMutable;
    constructor(args) {
      this.data = args.data;
      this.updateAuthority = args.updateAuthority;
      this.primarySaleHappened = args.primarySaleHappened;
      this.isMutable = args.isMutable;
    }
  
  }
  
  // reference:
  // export class UpdateMetadataV2Args extends Borsh.Data<{
  //   data?: DataV2;
  //   updateAuthority?: string;
  //   primarySaleHappened: boolean | null;
  //   isMutable: boolean | null;
  // }> {
  //   static readonly SCHEMA = new Map([
  //     ...DataV2.SCHEMA,
  //     ...UpdateMetadataV2Args.struct([
  //       ['instruction', 'u8'],
  //       ['data', { kind: 'option', type: DataV2 }],
  //       ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
  //       ['primarySaleHappened', { kind: 'option', type: 'u8' }],
  //       ['isMutable', { kind: 'option', type: 'u8' }],
  //     ]),
  //   ]);
  
  //   instruction = 15;
  //   // NOTE: do not add "=null". This breaks serialization.
  //   data: DataV2 | null;
  //   updateAuthority: string | null;
  //   primarySaleHappened: boolean | null;
  //   isMutable: boolean | null;
  // }
  
  class UpdateMetadataArgs {
    instruction = 1;
    data;
    // Not used by this app, just required for instruction
    updateAuthority;
    primarySaleHappened;
    constructor(args) {
      this.data = args.data ? args.data : null;
      this.updateAuthority = args.updateAuthority ? args.updateAuthority : null;
      this.primarySaleHappened = args.primarySaleHappened;
    }
  }
  
  export class MetadataKey {
    Uninitialized = 0;
    MetadataV1 = 4;
    EditionV1 = 1;
    MasterEditionV1 = 2;
    MasterEditionV2 = 6;
    EditionMarker = 7;
  }
  
  export class Metadata {
  
    constructor(args) {
      this.key = MetadataKey.MetadataV1;
      this.updateAuthority = args.updateAuthority;
      this.mint = args.mint;
      this.data = args.data;
      this.primarySaleHappened = args.primarySaleHappened;
      this.isMutable = args.isMutable;
      this.editionNonce = args.editionNonce ?? null;
    }
  
    async init() {
      const metadata = new PublicKey(METADATA_PROGRAM_ID);
      if (this.editionNonce !== null) {
        this.edition = (
          await PublicKey.createProgramAddress(
            [
              Buffer.from(METADATA_PREFIX),
              metadata.toBuffer(),
              new PublicKey(this.mint).toBuffer(),
              new Uint8Array([this.editionNonce || 0]),
            ],
            metadata,
          )
        ).toBase58();
      } else {
        this.edition = await getEdition(this.mint);
      }
      this.masterEdition = this.edition;
    }
  }
  
  // need to create this further
  
  // Metadata {
  //   pubkey: PublicKey {
  //     _bn: <BN: a8be2818f4cc3ee1a3374825ab9d461107ba043f8de00e70ffaafb566f53f47d>
  //   },
  //   info: {
  //     data: <Buffer 04 87 16 c1 5d 84 eb a1 5e a1 52 ac 8f 09 ac 05 2f 66 ff b6 ad e8 34 e1 af b6 ea 91 dd 34 7e 0a 25 d4 6d 72 e5 f8 21 29 64 7a e6 93 bc 96 24 db 70 a4 ... 629 more bytes>,
  //     executable: false,
  //     lamports: 5616720,
  //     owner: PublicKey {
  //       _bn: <BN: b7065b1e3d17c45389d527f6b04c3cd58b86c731aa0fdb549b6d1bc03f82946>
  //     },
  //     rentEpoch: 298
  //   },
  //   data: MetadataData {
  //     key: 4,
  //     updateAuthority: 'A6LAX8hhGM5U9gbjLfvPo7BDx5EHwpkyGmLSx6TXrt2x',
  //     mint: 'FJEEHRAKPcVUBfitPZDsmR8PtYfeg1Cy8RusVb7PuPgw',
  //     data: MetadataDataData {
  //       name: 'Claim Stake',
  //       symbol: 'STAKE3',
  //       uri: 'https://galaxy.staratlas.com/nfts/FJEEHRAKPcVUBfitPZDsmR8PtYfeg1Cy8RusVb7PuPgw',
  //       sellerFeeBasisPoints: 0,
  //       creators: undefined
  //     },
  //     primarySaleHappened: 0,
  //     isMutable: 1,
  //     editionNonce: 255,
  //     tokenStandard: 22,
  //     collection: Collection {
  //       verified: 93,
  //       key: '9wsD7Lctcg3VJJojstPVrnSCnNKKMVPQWe9WiVpGySue'
  //     },
  //     uses: Uses { useMethod: 255, total: <BN: 0>, remaining: <BN: 0> }
  //   }
  // }
  export class MetadataV2 {
  
    constructor(args) {
      this.key = MetadataKey.MetadataV1;
      this.updateAuthority = args.updateAuthority;
      this.mint = args.mint;
      this.data = args.data;
      this.primarySaleHappened = args.primarySaleHappened;
      this.isMutable = args.isMutable;
      this.editionNonce = args.editionNonce ?? null;
      this.collection = args.collection ?? null;
      this.uses = args.uses ?? null;
    }
  
    async init() {
      const metadata = new PublicKey(METADATA_PROGRAM_ID);
      if (this.editionNonce !== null) {
        this.edition = (
          await PublicKey.createProgramAddress(
            [
              Buffer.from(METADATA_PREFIX),
              metadata.toBuffer(),
              new PublicKey(this.mint).toBuffer(),
              new Uint8Array([this.editionNonce || 0]),
            ],
            metadata,
          )
        ).toBase58();
      } else {
        this.edition = await getEdition(this.mint);
      }
      this.masterEdition = this.edition;
    }
  }
  
  export class Creator {
    address;
    verified;
    share;
  
    constructor(args) {
      this.address = args.address;
      this.verified = args.verified;
      this.share = args.share;
    }
  }
  
  export class Collection {
    verified;
    key;
  
    constructor(args) {
      this.key = args.key;
      this.verified = args.verified;
    }
  }
  
  /******** COLLECTION *********/
  // type Args = { key: StringPublicKey; verified: boolean }
  // export class Collection extends Borsh.Data<Args> {
  //   static readonly SCHEMA = Collection.struct([
  //     ['verified', 'u8'],
  //     ['key', 'pubkeyAsString'],
  //   ]);
  //   key: StringPublicKey;
  //   verified: boolean;
  
  //   constructor(args: Args) {
  //     super(args);
  //     this.key = args.key;
  //     this.verified = args.verified;
  //   }
  // }
  
  export class Uses {
    useMethod;
    total;
    remaining;
  
    constructor(args) {
      this.useMethod = args.useMethod;
      this.total = args.total;
      this.remaining = args.remaining;
    }
  }
  
  /******** USES *********/
  // type Args = { useMethod: UseMethod; total: number; remaining: number };
  // export class Uses extends Borsh.Data<Args> {
  //   static readonly SCHEMA = Uses.struct([
  //     ['useMethod', 'u8'],
  //     ['total', 'u64'],
  //     ['remaining', 'u64'],
  //   ]);
  //   useMethod: UseMethod;
  //   total: number;
  //   remaining: number;
  
  //   constructor(args: Args) {
  //     super(args);
  //     this.useMethod = args.useMethod;
  //     this.total = args.total;
  //     this.remaining = args.remaining;
  //   }
  // }
  
  export class Data {
    name;
    symbol;
    uri;
    sellerFeeBasisPoints;
    creators;
    constructor(args) {
      this.name = args.name;
      this.symbol = args.symbol;
      this.uri = args.uri;
      this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
      this.creators = args.creators;
    }
  }
  // need to clear schema all over the code
  export class DataV2 {
    name;
    symbol;
    uri;
    sellerFeeBasisPoints;
    creators;
    collection;
    uses;
    constructor(args) {
      this.name = args.name
      this.symbol = args.symbol
      this.uri = args.uri
      this.sellerFeeBasisPoints = args.sellerFeeBasisPoints
      this.creators = args.creators
      this.collection = args.collection
      this.uses = args.uses
    }
  
  }
  
  
  class CreateMasterEditionV3Args {
    instruction = 17;
    maxSupply;
    constructor(args) {
      this.maxSupply = args.maxSupply;
    }
  }
  
  class CreateMasterEditionArgs {
    instruction = 10;
    maxSupply;
    constructor(args) {
      this.maxSupply = args.maxSupply;
    }
  }
  
  // need to update metadata_schema with CreateMetadataV2Args, UpdateMetadataV2Args, CreateMasterEditionV3Args
  export const METADATA_SCHEMA = new Map([
    [
      CreateMetadataArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['data', Data],
          ['isMutable', 'u8'], // bool
        ],
      },
    ],
    [
      UpdateMetadataArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['data', { kind: 'option', type: Data }],
          ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
          ['primarySaleHappened', { kind: 'option', type: 'u8' }],
        ],
      },
    ],
    [
      CreateMasterEditionArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['maxSupply', { kind: 'option', type: 'u64' }],
        ],
      },
    ],
    [
      Data,
      {
        kind: 'struct',
        fields: [
          ['name', 'string'],
          ['symbol', 'string'],
          ['uri', 'string'],
          ['sellerFeeBasisPoints', 'u16'],
          ['creators', { kind: 'option', type: [Creator] }],
        ],
      },
    ],
    [
      Creator,
      {
        kind: 'struct',
        fields: [
          ['address', 'pubkeyAsString'],
          ['verified', 'u8'],
          ['share', 'u8'],
        ],
      },
    ],
    [
      Metadata,
      {
        kind: 'struct',
        fields: [
          ['key', 'u8'],
          ['updateAuthority', 'pubkeyAsString'],
          ['mint', 'pubkeyAsString'],
          ['data', Data],
          ['primarySaleHappened', 'u8'], // bool
          ['isMutable', 'u8'], // bool
        ],
      },
    ],
  ])
  
  
  
  class SignMetadataArgs {
    instruction = 7;
  
    constructor(args) {
  
    }
  
  }
  
  // SignMetadataArgs Add to Schema
  
  // need to update metadata_schema with CreateMetadataV2Args, UpdateMetadataV2Args, CreateMasterEditionV3Args
  export const NEW_METADATA_SCHEMA = new Map([
    [
      CreateMetadataArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['data', Data],
          ['isMutable', 'u8'], // bool
        ],
      },
    ],
    [
      CreateMetadataV2Args,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['data', Data],
          ['isMutable', 'u8'], // bool
        ],
      },
    ],
    [
      UpdateMetadataArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['data', { kind: 'option', type: Data }],
          ['updateAuthority', { kind: 'option', type: 'pubkeyAsString' }],
          ['primarySaleHappened', { kind: 'option', type: 'u8' }],
        ],
      },
    ],
    [
      CreateMasterEditionArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['maxSupply', { kind: 'option', type: 'u64' }],
        ],
      },
    ],
    [
      CreateMasterEditionV3Args,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['maxSupply', { kind: 'option', type: 'u64' }],
        ],
      },
    ],
    [
      Data,
      {
        kind: 'struct',
        fields: [
          ['name', 'string'],
          ['symbol', 'string'],
          ['uri', 'string'],
          ['sellerFeeBasisPoints', 'u16'],
          ['creators', { kind: 'option', type: [Creator] }],
        ],
      },
    ],
    [
      DataV2,
      {
        kind: 'struct',
        fields: [
          ['name', 'string'],
          ['symbol', 'string'],
          ['uri', 'string'],
          ['sellerFeeBasisPoints', 'u16'],
          ['creators', { kind: 'option', type: [Creator] }],
          ['collection', { kind: 'option', type: Collection }],
          ['uses', { kind: 'option', type: Uses }],
        ],
      },
    ],
    [
      Creator,
      {
        kind: 'struct',
        fields: [
          ['address', 'pubkeyAsString'],
          ['verified', 'u8'],
          ['share', 'u8'],
        ],
      },
    ],
    [
      Metadata,
      {
        kind: 'struct',
        fields: [
          ['key', 'u8'],
          ['updateAuthority', 'pubkeyAsString'],
          ['mint', 'pubkeyAsString'],
          ['data', Data],
          ['primarySaleHappened', 'u8'], // bool
          ['isMutable', 'u8'], // bool
        ],
      },
    ],
    [
      SignMetadataArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
        ],
      },
  
    ],
  ])
  
  
  
  // Program log: (Deprecated as of 1.1.0) Instruction: Create Metadata Accounts
  export async function createMetadata(
    data,
    updateAuthority,
    mintKey,
    mintAuthorityKey,
    instructions,
    payer,
  ) {
  
  
    const metadataAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          new PublicKey(mintKey).toBuffer(),
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log('Data', data);
    const value = new CreateMetadataArgs({ data, isMutable: true });
    console.log(value);
    const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));
    console.log("txnData - createMetadata", txnData);
  
    const keys = [
      {
        pubkey: new PublicKey(metadataAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(mintKey),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(mintAuthorityKey),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(payer),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(updateAuthority),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: new PublicKey(METADATA_PROGRAM_ID),
        data: txnData,
      }),
    );
  
    return metadataAccount;
  }
  
  export async function createMetadataV2(
    data,
    updateAuthority,
    mintKey,
    mintAuthorityKey,
    instructions,
    payer,
  ) {
  
    const metadataAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          new PublicKey(mintKey).toBuffer(),
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log('Metadata V2', data);
    const value = new CreateMetadataV2Args({ data, isMutable: true });
  
    // final alternative:  
    // // Create metadata
    // const metadataAccount = await getMetadata(mint.publicKey);
    // let txnData = Buffer.from(
    //   serialize(
    //     new Map([
    //       DataV2.SCHEMA,
    //       ...METADATA_SCHEMA,
    //       ...CreateMetadataV2Args.SCHEMA,
    //     ]),
    //     new CreateMetadataV2Args({ data, isMutable: mutableMetadata }),
    //   ),
    // );
  
    // need to unminify below:
    // const txnData = Buffer.from(serialize(new Map([
    //     mpl_token_metadata_1.DataV2.SCHEMA,
    //     ...exports.METADATA_SCHEMA,
    //     ...mpl_token_metadata_1.CreateMetadataV2Args.SCHEMA,
    // ]), value));
  
    //   const txnData = Buffer.from(serialize(new Map([
    //     DataV2.SCHEMA,
    //     METADATA_SCHEMA,
    //     CreateMetadataV2Args.SCHEMA,
    // ]), value));
  
    // const txnData = Buffer.from(serialize(new Map([
    //   [DataV2,
    //     {
    //       kind: 'struct',
    //       fields: [
    //         ['name', 'string'],
    //         ['symbol', 'string'],
    //         ['uri', 'string'],
    //         ['sellerFeeBasisPoints', 'u16'],
    //         ['creators', { kind: 'option', type: [Creator] }],
    //         ['collection', { kind: 'option', type: Collection }],
    //         ['uses', { kind: 'option', type: Uses }],
    //       ],
    //     },],
    //   METADATA_SCHEMA,
    //   [CreateMetadataV2Args,
    //     {
    //       kind: 'struct',
    //       fields: [
    //         ['instruction', 'u8'],
    //         ['data', Data],
    //         ['isMutable', 'u8'], // bool
    //       ],
    //     },],
    // ]), value));
  
    const txnData = Buffer.from(serialize(NEW_METADATA_SCHEMA, value));
  
    console.log("🚀 ~ file: NonFungibleTokenV3.mjs ~ line 576 ~ txnData", txnData)
  
  
    const keys = [
      {
        pubkey: new PublicKey(metadataAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(mintKey),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(mintAuthorityKey),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(payer),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(updateAuthority),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: new PublicKey(METADATA_PROGRAM_ID),
        data: txnData,
      }),
    );
  
    return metadataAccount;
  }
  // used once json data is uploaded in arweave URI, then we update the metadata with new URI using this function
  export async function updateMetadata(
    data,
    newUpdateAuthority,
    primarySaleHappened,
    mintKey,
    updateAuthority,
    instructions,
    metadataAccount,
  ) {
  
  
    metadataAccount =
      metadataAccount ||
      (
        await PublicKey.findProgramAddress(
          [
            Buffer.from('metadata'),
            METADATA_PROGRAM_ID.toBuffer(),
            new PublicKey(mintKey).toBuffer(),
          ],
          METADATA_PROGRAM_ID,
        )
      )[0];
  
    const value = new UpdateMetadataArgs({
      data,
      updateAuthority: !newUpdateAuthority ? undefined : newUpdateAuthority,
      primarySaleHappened:
        primarySaleHappened === null || primarySaleHappened === undefined
          ? null
          : primarySaleHappened,
    });
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 844 ~ updateMetadata - value", value)
    const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));
    const keys = [
      {
        pubkey: new PublicKey(metadataAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(updateAuthority),
        isSigner: true,
        isWritable: false,
      },
    ];
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: METADATA_PROGRAM_ID,
        data: txnData,
      }),
    );
  
    return metadataAccount;
  }
  
  export async function updateMetadataV2(
    data,
    newUpdateAuthority,
    primarySaleHappened,
    mintKey,
    updateAuthority,
    instructions,
    metadataAccount,
    isMutable
  ) {
    metadataAccount =
      metadataAccount ||
      (
        await PublicKey.findProgramAddress(
          [
            Buffer.from('metadata'),
            METADATA_PROGRAM_ID.toBuffer(),
            new PublicKey(mintKey).toBuffer(),
          ],
          METADATA_PROGRAM_ID,
        )
      )[0];
  
    const value = new UpdateMetadataV2Args({
      data,
      updateAuthority: !newUpdateAuthority ? undefined : newUpdateAuthority,
      primarySaleHappened: primarySaleHappened === null || primarySaleHappened === undefined
        ? null
        : primarySaleHappened,
      isMutable: typeof isMutable == 'boolean' ? isMutable : null,
    });
  
    // // need to unminify below:
    // const txnData = Buffer.from((0, borsh_1.serialize)(new Map([
    //     mpl_token_metadata_1.DataV2.SCHEMA,
    //     ...exports.METADATA_SCHEMA,
    //     ...mpl_token_metadata_1.UpdateMetadataV2Args.SCHEMA,
    // ]), value));
  
    // need to unminify below:
    const txnData = Buffer.from(serialize(new Map([
      DataV2.SCHEMA,
      METADATA_SCHEMA,
      UpdateMetadataV2Args.SCHEMA,
    ]), value));
  
    const keys = [
      {
        pubkey: new PublicKey(metadataAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(updateAuthority),
        isSigner: true,
        isWritable: false,
      },
    ];
  
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: METADATA_PROGRAM_ID,
        data: txnData,
      }),
    );
    return metadataAccount;
  }
  
  export async function getEdition(
    tokenMint,
  ) {
  
  
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          new PublicKey(tokenMint).toBuffer(),
          Buffer.from(EDITION),
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
  }
  
  // const masterEditionPubkey = await MasterEdition.getPDA(mintKey.publicKey);
  // let createMev3 = new CreateMasterEditionV3(
  //   { feePayer: payer.publicKey },
  //   {
  //     edition: masterEditionPubkey, // masteredition PDA
  //     metadata: metadata, //metadata account
  //     updateAuthority: payer.publicKey,
  //     mint: mint.publicKey, // token mint address
  //     mintAuthority: payer.publicKey,
  //     maxSupply: new BN(maxSupply),
  //   }
  // );
  // createMev3.recentBlockhash = (
  //   await connection.getRecentBlockhash()
  // ).blockhash;
  // await createMev3.sign(payer);
  
  // const createTxDetails = await connection.sendRawTransaction(
  //   createMev3.serialize(),
  //   {
  //     skipPreflight: true,
  //   }
  // );
  // await connection.confirmTransaction(createTxDetails, connection.commitment);
  // return { mint, metadata, masterEditionPubkey, createTxDetails };
  
  
  export async function createMasterEditionV3(
    maxSupply,
    mintKey,
    updateAuthorityKey,
    mintAuthorityKey,
    payer,
    instructions,
  ) {
  
  
    const metadataAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          new PublicKey(mintKey).toBuffer(),
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 527 ~ metadataAccount", metadataAccount.toBase58())
  
    const editionAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          new PublicKey(mintKey).toBuffer(),
          Buffer.from(EDITION), // edition seed changed
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 540 ~ editionAccount", editionAccount.toBase58())
  
    console.log("maxSupply: ", maxSupply);
    const value = new CreateMasterEditionV3Args({ maxSupply: maxSupply || null });
    // need to change below
    // CreateMasterEditionV3Args is in METADATA_SCHEMA?
    // can change it to NEW_METADATA_SCHEMA
    const data = Buffer.from(serialize(NEW_METADATA_SCHEMA, value)); //METADATA_SCHEMA ==> DataV2.schema
    //   const txnData = Buffer.from((0, borsh_1.serialize)(new Map([
    //     mpl_token_metadata_1.DataV2.SCHEMA,
    //     ...exports.METADATA_SCHEMA,
    //     ...mpl_token_metadata_1.CreateMasterEditionV3Args.SCHEMA,
    // ]), value));
  
    // === const txnData = Buffer.from(serialize(new Map([DataV2.SCHEMA, METADATA_SCHEMA, CreateMasterEditionV3Args.SCHEMA]), value));
  
  
    // const data = Buffer.from((0, borsh_1.serialize)(exports.METADATA_SCHEMA, value));   ===   const data = Buffer.from(serialize(METADATA_SCHEMA, value));
  
    const keys = [
      {
        pubkey: new PublicKey(editionAccount),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(mintKey),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: new PublicKey(updateAuthorityKey),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(mintAuthorityKey),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(payer),
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: new PublicKey(metadataAccount),
        isSigner: false,
        isWritable: false,
      },
  
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
  
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: METADATA_PROGRAM_ID,
        data,
      }),
    );
  }
  
  // call using: mintkey:spltoken address: string , creator=wallet.publicKey
  export async function signMetadata(
    mintKey,
    creator,
    instructions,
  ) {
    const metadataAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          new PublicKey(mintKey).toBuffer(),
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ signMetadata ~ metadataAccount", metadataAccount.toBase58())
  
    const value = new SignMetadataArgs();
  
    // need to change below
    // CreateMasterEditionV3Args is in METADATA_SCHEMA?
    // can change it to NEW_METADATA_SCHEMA
  
    const data = Buffer.from(serialize(NEW_METADATA_SCHEMA, value)); //METADATA_SCHEMA ==> DataV2.schema
  
    //   const txnData = Buffer.from((0, borsh_1.serialize)(new Map([
    //     mpl_token_metadata_1.DataV2.SCHEMA,
    //     ...exports.METADATA_SCHEMA,
    //     ...mpl_token_metadata_1.CreateMasterEditionV3Args.SCHEMA,
    // ]), value));
  
    // === const txnData = Buffer.from(serialize(new Map([DataV2.SCHEMA, METADATA_SCHEMA, CreateMasterEditionV3Args.SCHEMA]), value));
  
  
    // const data = Buffer.from((0, borsh_1.serialize)(exports.METADATA_SCHEMA, value));   ===   const data = Buffer.from(serialize(METADATA_SCHEMA, value));
  
    let keys = [
      {
        pubkey: metadataAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: creator,
        isSigner: true,
        isWritable: false,
      },
    ];
  
    instructions.push(
      new TransactionInstruction({
        keys,
        programId: METADATA_PROGRAM_ID,
        data,
      }),
    );
  
    // instructions.push(
    //   new TransactionInstruction({
    //     keys,
    //     programId: new PublicKey(METADATA_PROGRAM_ID),
    //     data: txnData,
    //   }),
    // );
  }
  
  export const getUnixTs = () => {
    return new Date().getTime() / 1000;
  };
  
  const DEFAULT_TIMEOUT = 40000; // changed from 15000 to 20000 ms -> error then changed to 40000
  
  async function newtempfunc(Tx, connection) {
    console.log("After sign: ", Tx)
    const wireFormatTx = Tx.serialize();
    console.log("🚀 ~ file: SPLtoken.js ~ line 99 ~ burnToken ~ wireFormatTx", wireFormatTx)
    const TxSig = await connection.sendRawTransaction(wireFormatTx, {
      skipPreflight: true,
    });
    console.log("🚀 ~ file: SPLtoken.js ~ line 102 ~ burnToken ~ TxSig", TxSig);
    const confirmStatus = await connection.confirmTransaction(TxSig, 'confirmed');
    console.log("confirm status: ", confirmStatus);
    return TxSig;

  }
  // remove deprecated functions in sendTransactionWithRetry2
  export const sendTransactionWithRetry = async (
    connection,
    wallet,
    instructions,
    signers,
    commitment = 'singleGossip',
    includesFeePayer = false,
    block,
    beforeSend,
  ) => {
  
    let transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.recentBlockhash = (
      block || (await connection.getRecentBlockhash(commitment))
    ).blockhash;
  
    console.log("wallet inside sendTransactionWithRetry: ", wallet)
    transaction.feePayer = wallet.publicKey;
  
    // if (includesFeePayer) {
    //   transaction.setSigners(...signers.map(s => s.publicKey));
    // } else {
    //   transaction.setSigners(
    //     // fee payed by the wallet owner
    //     wallet.publicKey,
    //     ...signers.map(s => s.publicKey),
    //   );
    //   console.log("Signers are set")
    //   console.log("signers: ", signers)
    //   console.log("transaction object: ", transaction)
    //   console.log("pubkey 0 of signers: ", transaction.signatures[0].publicKey.toBase58())
    //   console.log("pubkey 1 of signers: ", transaction.signatures[1].publicKey.toBase58())
  
    // }
  
    // if (signers.length > 0) {
    //   transaction.partialSign(...signers);
    // }
    // let txid;
    if (!includesFeePayer) {
      // transaction = await wallet.signTransaction(transaction);
      transaction.sign(wallet, ...signers)
  
      // next line is for testing
      console.log("using newtempfunc")
       newtempfunc(transaction, connection)
    //    txid = newtempfunc(transaction, connection)

      // transaction.sign(...signers, wallet)
  
      // transaction.sign(wallet)
  
      console.log("Signers have signed the transaction")
      console.log("transaction object attempt2: ", transaction)
      console.log("pubkey 0 of signers: ", transaction.signatures[0].publicKey.toBase58())
      console.log("pubkey 1 of signers: ", transaction.signatures[1].publicKey.toBase58())
    }
  
    if (beforeSend) {
      beforeSend();
    }
  
    const { txid, slot } = await sendSignedTransaction({
      connection,
      signedTransaction: transaction,
    });
  
    return { txid, slot };
    // return txid;

  };
  
  export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // below function serializes the signed transaction with addtional parameters: requireAllSignatures: true && verifySignatures: false,
  export async function sendSignedTransaction({
    signedTransaction,
    connection,
    timeout = DEFAULT_TIMEOUT,
  }) {
    const rawTransaction = signedTransaction.serialize({
      requireAllSignatures: true,
      verifySignatures: false,
    });
    // this is buffer
    console.log("raw transaction: ", rawTransaction)
    const realTrnxObj = Transaction.from(rawTransaction)
    console.log("from: ", realTrnxObj.feePayer.toBase58())
    const startTime = getUnixTs();
    let slot = 0;
    const txid = await connection.sendRawTransaction(
      rawTransaction,
      {
        skipPreflight: true,
      },
    );
    // const txid = await connection.sendRawTransaction(
    //   rawTransaction
    // );
    console.log("txid: ", txid)
  
    console.log('Started awaiting confirmation for', txid);
  
    let done = false;
    (async () => {
      while (!done && getUnixTs() - startTime < timeout) {
        connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
        });
        await sleep(500);
      }
    })();
    try {
      const confirmation = await awaitTransactionSignatureConfirmation(
        txid,
        timeout,
        connection,
        'recent',
        true,
      );
  
      if (!confirmation)
        throw new Error('Timed out awaiting confirmation on transaction');
  
      if (confirmation.err) {
        console.error(confirmation.err);
        throw new Error('Transaction failed: Custom instruction error');
      }
  
      slot = confirmation?.slot || 0;
    } catch (err) {
      console.error('Timeout Error caught', err);
      if (err.timeout) {
        throw new Error('Timed out awaiting confirmation on transaction');
      }
      let simulateResult = null;
      try {
        simulateResult = (
          await simulateTransaction(connection, signedTransaction, 'single')
        ).value;
      } catch (e) { }
      if (simulateResult && simulateResult.err) {
        if (simulateResult.logs) {
          console.log(simulateResult.logs);
          for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
            const line = simulateResult.logs[i];
            if (line.startsWith('Program log: ')) {
              throw new Error(
                'Transaction failed: ' + line.slice('Program log: '.length),
              );
            }
          }
        }
        throw new Error(JSON.stringify(simulateResult.err));
      }
      // throw new Error('Transaction failed');
    } finally {
      done = true;
    }
  
    console.log('Latency', txid, getUnixTs() - startTime);
    // console.log(`https://solscan.io/tx/${txid}/?cluster=devnet`);
    console.log(`https://amman-explorer.metaplex.com/tx/${txid}`);

    return { txid, slot };
  }
  
  // // the only change below function has is serialize with empty parameters
  // export async function sendSignedTransaction2({
  //   signedTransaction,
  //   connection,
  //   timeout = DEFAULT_TIMEOUT,
  // }) {
  //   const rawTransaction = signedTransaction.serialize();
  //   const startTime = getUnixTs();
  //   let slot = 0;
  //   const txid = await connection.sendRawTransaction(
  //     rawTransaction,
  //     {
  //       skipPreflight: true,
  //     },
  //   );
  
  //   console.log('Started awaiting confirmation for', txid);
  
  //   let done = false;
  //   (async () => {
  //     while (!done && getUnixTs() - startTime < timeout) {
  //       connection.sendRawTransaction(rawTransaction, {
  //         skipPreflight: true,
  //       });
  //       await sleep(500);
  //     }
  //   })();
  //   try {
  //     const confirmation = await awaitTransactionSignatureConfirmation(
  //       txid,
  //       timeout,
  //       connection,
  //       'recent',
  //       true,
  //     );
  
  //     if (!confirmation)
  //       throw new Error('Timed out awaiting confirmation on transaction');
  
  //     if (confirmation.err) {
  //       console.error(confirmation.err);
  //       throw new Error('Transaction failed: Custom instruction error');
  //     }
  
  //     slot = confirmation?.slot || 0;
  //   } catch (err) {
  //     console.error('Timeout Error caught', err);
  //     if (err.timeout) {
  //       throw new Error('Timed out awaiting confirmation on transaction');
  //     }
  //     let simulateResult = null;
  //     try {
  //       simulateResult = (
  //         await simulateTransaction(connection, signedTransaction, 'single')
  //       ).value;
  //     } catch (e) { }
  //     if (simulateResult && simulateResult.err) {
  //       if (simulateResult.logs) {
  //         console.log(simulateResult.logs);
  //         for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
  //           const line = simulateResult.logs[i];
  //           if (line.startsWith('Program log: ')) {
  //             throw new Error(
  //               'Transaction failed: ' + line.slice('Program log: '.length),
  //             );
  //           }
  //         }
  //       }
  //       throw new Error(JSON.stringify(simulateResult.err));
  //     }
  //     // throw new Error('Transaction failed');
  //   } finally {
  //     done = true;
  //   }
  
  //   console.log('Latency', txid, getUnixTs() - startTime);
  //   return { txid, slot };
  // }
  
  // under construction for simulating transaction
  async function simulateTransaction(
    connection,
    transaction,
    commitment,
  ) {
    // @ts-ignore
    transaction.recentBlockhash = await connection._recentBlockhash(
      // @ts-ignore
      connection._disableBlockhashCaching,
    );
  
    const signData = transaction.serializeMessage();
    // @ts-ignore
    const wireTransaction = transaction._serialize(signData);
    const encodedTransaction = wireTransaction.toString('base64');
    const config = { encoding: 'base64', commitment };
    const args = [encodedTransaction, config];
  
    // @ts-ignore
    const res = await connection._rpcRequest('simulateTransaction', args);
    if (res.error) {
      throw new Error('failed to simulate transaction: ' + res.error.message);
    }
    return res.result;
  }
  
  
  async function awaitTransactionSignatureConfirmation(
    txid,
    timeout,
    connection,
    commitment = 'recent',
    queryStatus = false,
  ) {
    let done = false;
    let status = {
      slot: 0,
      confirmations: 0,
      err: null,
    };
    let subId = 0;
    status = await new Promise(async (resolve, reject) => {
      setTimeout(() => {
        if (done) {
          return;
        }
        done = true;
        console.log('Rejecting for timeout...');
        reject({ timeout: true });
      }, timeout);
      try {
        subId = connection.onSignature(
          txid,
          (result, context) => {
            done = true;
            status = {
              err: result.err,
              slot: context.slot,
              confirmations: 0,
            };
            if (result.err) {
              console.log('Rejected via websocket', result.err);
              reject(status);
            } else {
              console.log('Resolved via websocket', result);
              resolve(status);
            }
          },
          commitment,
        );
      } catch (e) {
        done = true;
        console.error('WS error in setup', txid, e);
      }
      while (!done && queryStatus) {
        // eslint-disable-next-line no-loop-func
        (async () => {
          try {
            const signatureStatuses = await connection.getSignatureStatuses([
              txid,
            ]);
            status = signatureStatuses && signatureStatuses.value[0];
            if (!done) {
              if (!status) {
                console.log('REST null result for', txid, status);
              } else if (status.err) {
                console.log('REST error for', txid, status);
                done = true;
                reject(status.err);
              } else if (!status.confirmations) {
                console.log('REST no confirmations for', txid, status);
              } else {
                console.log('REST confirmation for', txid, status);
                done = true;
                resolve(status);
              }
            }
          } catch (e) {
            if (!done) {
              console.log('REST connection error: txid', txid, e);
            }
          }
        })();
        await sleep(2000);
      }
    });
  
    //@ts-ignore
    if (connection._signatureSubscriptions[subId])
      connection.removeSignatureListener(subId);
    done = true;
    console.log('Returning status', status);
    return status;
  }
  
  // need to work on arweave image upload
  const uploadToArweave = async (data) => {
    const resp = await fetch(
      'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile4',
      {
        method: 'POST',
        // @ts-ignore
        body: data,
      },
    );
  
    if (!resp.ok) {
      return Promise.reject(
        new Error(
          'Unable to upload the artwork to Arweave. Please wait and then try again.',
        ),
      );
    }
  
    const result = await resp.json();
  
    if (result.error) {
      return Promise.reject(new Error(result.error));
    }
  
    return result;
  };
  
  
  
  // devnet wallet
  // devnet connection
  // nft metadata
  // nft onchain metadata uri
  // we have two creators below in function
  export async function mintNFT(publicKey) {
    const wallet = Keypair.fromSecretKey(new Uint8Array([87, 39, 79, 60, 187, 138, 73, 167, 175, 64, 207, 249, 28, 209, 65, 182, 197, 81, 186, 181, 188, 76, 214, 213, 247, 172, 208, 233, 238, 160, 126, 35, 171, 146, 104, 232, 218, 189, 154, 121, 93, 104, 137, 104, 57, 196, 108, 25, 181, 143, 129, 56, 194, 25, 29, 162, 47, 134, 186, 243, 53, 182, 138, 250]))
    console.log("wallet address: ", wallet.publicKey.toBase58())
  
    // const wallet = window.solana;
  
    let instructions = [];
    let signers = [];
    const metadataContent = {
      name: "Cool NFT",
      symbol: "cool",
      description: "Cool nft description",
      seller_fee_basis_points: "10",
      image: "https://www.arweave.net/kKbFinuljw5cbEYAg2-tWpGQNiVu48zgy7vUA5DuHQ4?ext=png",
      animation_url: "",
      attributes: [
        {
          "trait_type": "cool",
          "value": "so cool"
        }
      ],
      external_url: "",
      properties: {
        files: [{
          uri: "https://www.arweave.net/kKbFinuljw5cbEYAg2-tWpGQNiVu48zgy7vUA5DuHQ4?ext=png",
          type: "image/png"
        }],
        category: "image",
        creators: [{
          address: wallet.publicKey.toBase58(),
          share: 0,
          verified: false,
        },
        {
          address: publicKey.toBase58(),
          share: 100,
          verified: false,
        }],
      },
      collection: null,
      uses: null
  
    };

    const localhoststr = "http://127.0.0.1:8899/"
    const devnetstr = "https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/"
  
    const connection = new Connection(localhoststr)
  
    const mintRent = await connection.getMinimumBalanceForRentExemption(
      MintLayout.span,
    );
  
    const payerPublicKey = wallet.publicKey.toBase58();
  
    const mintKey = createMint(
      instructions,
      wallet.publicKey,
      mintRent,
      0,
      // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
      // new PublicKey(publicKey), // owner -- changed
      new PublicKey(payerPublicKey), // owner 
      new PublicKey(payerPublicKey), // freeze authority
      signers,
    );
  
    console.log("mint key inside mintNFT: ", mintKey.toBase58());
  
  
    // publicKey.toBuffer() need to change publicKey==wallet
    // set global wallet keypair
    // recipientKey == 
    const recipientKey = (
      await PublicKey.findProgramAddress(
        [
          publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(mintKey).toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      )
    )[0];
  
    // recipient is set to the creator's address
    // const recipientKey = await splToken.Token.getAssociatedTokenAddress(
    //   new PublicKey(SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID),
    //   new PublicKey(TOKEN_PROGRAM_ID),
    //   new PublicKey(mintKey),
    //   publicKey, // recipient address == creator's address
    // )
    // console.log("NFT ATA from utility: ", recipientKey.toBase58());
  
    console.log("recipient key inside mintNFT: ", recipientKey.toBase58());
  
    // Instruction 3 - changed
    createAssociatedTokenAccountInstruction(
      instructions,
      new PublicKey(recipientKey),
      wallet.publicKey, // payer
      new PublicKey(publicKey), // wallet address that holds the recipient key
      // wallet.publicKey, // wallet address that holds the recipient key
      new PublicKey(mintKey),
    );
  
    // Instruction 4
    // check-in from @metaplex/js JS SDK for recent metadata standard changes
    // new DataV2({
    // 	symbol: metadataContent.symbol,
    // 	name: metadataContent.name,
    // 	uri: ""https://arweave.net/gfb0feghhE0VgyDwFGo6_Vp_LKwbKSGDORHFc9-g314"",
    // 	sellerFeeBasisPoints: metadataContent.seller_fee_basis_points,
    // 	creators: creators,
    // 	collection: null,
    // 	uses: null,
    // });
  
    const metadataAccount = await createMetadataV2(
      new DataV2({
        symbol: metadataContent.symbol,
        name: metadataContent.name,
        uri: "https://arweave.net/gfb0feghhE0VgyDwFGo6_Vp_LKwbKSGDORHFc9-g314", // size of url for arweave // "" //it requires json url
        sellerFeeBasisPoints: metadataContent.seller_fee_basis_points,
        creators: [new Creator({
          address: metadataContent.properties.creators[0].address,
          verified: metadataContent.properties.creators[0].verified,
          share: metadataContent.properties.creators[0].share
        }),
        new Creator({
          address: metadataContent.properties.creators[1].address,
          verified: metadataContent.properties.creators[1].verified,
          share: metadataContent.properties.creators[1].share
        })],
        collection: metadataContent.collection,
        uses: metadataContent.uses,
      }),
      payerPublicKey,
      mintKey,
      payerPublicKey,
      instructions,
      wallet.publicKey.toBase58(),
    );
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 1085 ~ mintNFT ~ metadataAccount", metadataAccount.toBase58())
  
    // Instruction 5
    // static createMintToInstruction(
    //   programId: PublicKey,
    //   mint: PublicKey,
    //   dest: PublicKey,
    //   authority: PublicKey,
    //   multiSigners: Array<Signer>,
    //   amount: number | u64,
    // ): TransactionInstruction;
    instructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        new PublicKey(mintKey),
        new PublicKey(recipientKey),
        new PublicKey(payerPublicKey),
        [],
        1,
      ),
    );
  
    let maxSupply = undefined;
    await createMasterEditionV3(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      instructions,
    );
  
    //Instruction 6: Signing a NFT Metadata - Direct Call using mpl-token-metadata
    // const singleSignerTx = new SignMetadata(
    //   { feePayer: wallet.publicKey },
    //   {
    //     metadata: metadataAccount,
    //     creator: wallet.publicKey,
    //   }
    // )
    // instructions.push(singleSignerTx.instructions[0])
  
    //Instruction 6: Signing a NFT Metadata - Using Args and Schema
    await signMetadata(
      mintKey.toBase58(),
      wallet.publicKey, // creator's address who is signing the metadata
      instructions,
    );
  
    // Sending all transactions
  
    const { txid } = await sendTransactionWithRetry(
      connection,
      wallet,
      instructions,
      signers,
      'single',
    );
  
    try {
      // using await
      // tried .then method in below function
      await connection.confirmTransaction(txid, 'max');
    } catch {
      // ignore
      console.log("an error occured confirming transaction");
  
    }
  
    try {
      // using await
      // tried .then method in below function
      // await connection.getParsedConfirmedTransaction(txid, 'confirmed'); // deprecated method
      await connection.getParsedTransaction(txid, 'confirmed'); // regular method
  
    } catch {
      // ignore
      console.log("an error occured in getParsedTransaction method");
    }
  
  
    const editionAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          mintKey.toBuffer(),
          Buffer.from(EDITION), // edition seed changed
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 540 ~ editionAccount", editionAccount.toBase58())
    // const txId = await actions.signMetadata({ connection, wallet, editionAccount });
    // console.log('Signed NFT METADATA:', txId);
  
  
    // const tx = new Transaction({ feePayer: wallet.publicKey })
  
    //   // This tx includes one instruction for a given sign.
    //   const singleSignerTx = new SignMetadata(
    //     { feePayer: wallet.publicKey },
    //     {
    //       metadata: metadataAccount,
    //       creator: wallet.publicKey,
    //     }
    //   )
    //   tx.add(singleSignerTx.instructions[0])
    // const signedtxid = await connection.sendTransaction(tx, [wallet]);
    // console.log("NFT Signed: ", signedtxid)
  
  
  }
  
  export async function mintNFT_for_uploaded_Metadata(publicKey, metadataContent, onChainURI) {
  
    // // devnet wallet
    // const wallet = Keypair.fromSecretKey(new Uint8Array([87, 39, 79, 60, 187, 138, 73, 167, 175, 64, 207, 249, 28, 209, 65, 182, 197, 81, 186, 181, 188, 76, 214, 213, 247, 172, 208, 233, 238, 160, 126, 35, 171, 146, 104, 232, 218, 189, 154, 121, 93, 104, 137, 104, 57, 196, 108, 25, 181, 143, 129, 56, 194, 25, 29, 162, 47, 134, 186, 243, 53, 182, 138, 250]))
    // console.log("wallet address: ", wallet.publicKey.toBase58())
  
    // mainnet wallet
    const walletArray = new Uint8Array(process.env.CIRCLE_WALLET.split(',').map((e) => e * 1));
    const wallet = Keypair.fromSecretKey(walletArray);
    console.log("wallet address: ", wallet.publicKey.toBase58());
  
  
    // const wallet = window.solana;
  
    let instructions = [];
    let signers = [];
    // const metadataContent = {
    //   name: "Cool NFT",
    //   symbol: "cool",
    //   description: "Cool nft description",
    //   seller_fee_basis_points: "10",
    //   image: "https://www.arweave.net/kKbFinuljw5cbEYAg2-tWpGQNiVu48zgy7vUA5DuHQ4?ext=png",
    //   animation_url: "",
    //   attributes: [
    //     {
    //       "trait_type": "cool",
    //       "value": "so cool"
    //     }
    //   ],
    //   external_url: "",
    //   properties: {
    //     files: [{
    //       uri: "https://www.arweave.net/kKbFinuljw5cbEYAg2-tWpGQNiVu48zgy7vUA5DuHQ4?ext=png",
    //       type: "image/png"
    //     }],
    //     category: "image",
    //     creators: [{
    //       address: wallet.publicKey.toBase58(),
    //       share: 0,
    //       verified: false,
    //     },
    //     {
    //       address: publicKey.toBase58(),
    //       share: 100,
    //       verified: false,
    //     }],
    //   },
    //   collection: null,
    //   uses: null
  
    // };
  
    // const connection = new Connection(process.env.DEVNET_RPC_URL) // devnet transaction
    const connection = new Connection(process.env.MAINNET_RPC_URL) // mainnet transaction
  
    const mintRent = await connection.getMinimumBalanceForRentExemption(
      MintLayout.span,
    );
  
    const payerPublicKey = wallet.publicKey.toBase58();
  
    const mintKey = createMint(
      instructions,
      wallet.publicKey,
      mintRent,
      0,
      // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
      // new PublicKey(publicKey), // owner -- changed
      new PublicKey(payerPublicKey), // owner 
      new PublicKey(payerPublicKey), // freeze authority
      signers,
    );
  
    console.log("mint key inside mintNFT: ", mintKey.toBase58());
  
  
    // publicKey.toBuffer() need to change publicKey==wallet
    // set global wallet keypair
    // recipientKey == 
    const recipientKey = (
      await PublicKey.findProgramAddress(
        [
          publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(mintKey).toBuffer(),
        ],
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      )
    )[0];
  
    // recipient is set to the creator's address
    // const recipientKey = await splToken.Token.getAssociatedTokenAddress(
    //   new PublicKey(SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID),
    //   new PublicKey(TOKEN_PROGRAM_ID),
    //   new PublicKey(mintKey),
    //   publicKey, // recipient address == creator's address
    // )
    // console.log("NFT ATA from utility: ", recipientKey.toBase58());
  
    console.log("recipient key inside mintNFT: ", recipientKey.toBase58());
  
    // Instruction 3 - changed
    createAssociatedTokenAccountInstruction(
      instructions,
      new PublicKey(recipientKey),
      wallet.publicKey, // payer
      new PublicKey(publicKey), // wallet address that holds the recipient key
      // wallet.publicKey, // wallet address that holds the recipient key
      new PublicKey(mintKey),
    );
  
    // Instruction 4
    // check-in from @metaplex/js JS SDK for recent metadata standard changes
    // new DataV2({
    // 	symbol: metadataContent.symbol,
    // 	name: metadataContent.name,
    // 	uri: ""https://arweave.net/gfb0feghhE0VgyDwFGo6_Vp_LKwbKSGDORHFc9-g314"",
    // 	sellerFeeBasisPoints: metadataContent.seller_fee_basis_points,
    // 	creators: creators,
    // 	collection: null,
    // 	uses: null,
    // });
  
    const metadataAccount = await createMetadataV2(
      new DataV2({
        symbol: metadataContent.symbol,
        name: metadataContent.name,
        uri: onChainURI, // size of url for arweave // "" //it requires json url
        sellerFeeBasisPoints: metadataContent.seller_fee_basis_points,
        creators: [new Creator({
          address: metadataContent.properties.creators[0].address,
          verified: metadataContent.properties.creators[0].verified,
          share: metadataContent.properties.creators[0].share
        })],
        collection: null, // if left empty string, error
        uses: null, // if left empty string, error
      }),
      payerPublicKey,
      mintKey,
      payerPublicKey,
      instructions,
      wallet.publicKey.toBase58(),
    );
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 1085 ~ mintNFT ~ metadataAccount", metadataAccount.toBase58())
  
    // Instruction 5
    // static createMintToInstruction(
    //   programId: PublicKey,
    //   mint: PublicKey,
    //   dest: PublicKey,
    //   authority: PublicKey,
    //   multiSigners: Array<Signer>,
    //   amount: number | u64,
    // ): TransactionInstruction;
    instructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        new PublicKey(mintKey),
        new PublicKey(recipientKey),
        new PublicKey(payerPublicKey),
        [],
        1,
      ),
    );
  
    let maxSupply = undefined;
    await createMasterEditionV3(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      instructions,
    );
  
    //Instruction 6: Signing a NFT Metadata - Direct Call using mpl-token-metadata
    // const singleSignerTx = new SignMetadata(
    //   { feePayer: wallet.publicKey },
    //   {
    //     metadata: metadataAccount,
    //     creator: wallet.publicKey,
    //   }
    // )
    // instructions.push(singleSignerTx.instructions[0])
  
    //Instruction 6: Signing a NFT Metadata - Using Args and Schema
    await signMetadata(
      mintKey.toBase58(),
      wallet.publicKey, // creator's address who is signing the metadata
      instructions,
    );
  
    // Sending all transactions
  
    const { txid } = await sendTransactionWithRetry(
      connection,
      wallet,
      instructions,
      signers,
      'single',
    );
  
    try {
      connection.confirmTransaction(txid, 'max').then(
        (response) => {
          return { mintKey, txid }
        }
      );
    //   return { mintKey, txid }
    } catch {
      console.log("an error occured confirming transaction");
      // ignore
    }
  
    // await connection.getParsedConfirmedTransaction(txid, 'confirmed');
    // await connection.getParsedTransaction(txid, 'confirmed');
  
    const editionAccount = (
      await PublicKey.findProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
          mintKey.toBuffer(),
          Buffer.from(EDITION), // edition seed changed
        ],
        new PublicKey(METADATA_PROGRAM_ID),
      )
    )[0];
    console.log("🚀 ~ file: NonFungibleToken.mjs ~ line 540 ~ editionAccount", editionAccount.toBase58())
  
    return { mintKey, txid }
    // const txId = await actions.signMetadata({ connection, wallet, editionAccount });
    // console.log('Signed NFT METADATA:', txId);
  
  
    // const tx = new Transaction({ feePayer: wallet.publicKey })
  
    //   // This tx includes one instruction for a given sign.
    //   const singleSignerTx = new SignMetadata(
    //     { feePayer: wallet.publicKey },
    //     {
    //       metadata: metadataAccount,
    //       creator: wallet.publicKey,
    //     }
    //   )
    //   tx.add(singleSignerTx.instructions[0])
    // const signedtxid = await connection.sendTransaction(tx, [wallet]);
    // console.log("NFT Signed: ", signedtxid)
  
  
  }
  
  // var a = new PublicKey('CYkCiA1a2sBTfXoK1gQQpMdLcFVW7veHy3WqPw5d8U97')
  // var a = new PublicKey('6huK58ZRJQFJ1hd59ySaRfqfJQimSChWNYYNZJzHGRmX')
  // var a = new PublicKey('EdvDh3MsRULEABazRuoFKp11482yZS3GCSRtTXdaAa2Z')
//   var a = new PublicKey('GruSFAjP7gtmJ9k3SBAiCrMXyUByGJKR885MhKWM9KJD') // In case of devnet
//   var a = new PublicKey('8Mcfh7yRygN6z1UiY1JAW9a5JygNwH5WhWk3JXatifH7') // In case of devnet
  var a = new PublicKey('A5zmVJ7hQ6HtT37RjNcMYoyCQ1JwUuc4zqwWLy1qxwbU') // In case of devnet
  // spl-token transfer 4EnZzLm67CPcikSjVhJejjJFjdeBSuwVjDM4fZFAzZkn 1 GruSFAjP7gtmJ9k3SBAiCrMXyUByGJKR885MhKWM9KJD --fund-recipient
  // spl-token transfer J4eiBPvapoHZZtFs66FFRzUko8XCGoVk8m4dSc3xzK1p 1 8Mcfh7yRygN6z1UiY1JAW9a5JygNwH5WhWk3JXatifH7 --fund-recipient --allow-unfunded-recipient



  
  
  // var b = 'CYkCiA1a2sBTfXoK1gQQpMdLcFVW7veHy3WqPw5d8U97' 
  // In case of devnet
  mintNFT(a); // need to send PublicKey type only, currently been sending in string later inside converted to PublicKey
  
  
  async function mainMainnet() {
    const MetadataString = fs.readFileSync('./storage/ALLmetadata.json');
    const MetadataObj = JSON.parse(MetadataString);
  
    const onchainURIString = fs.readFileSync('./storage/ALLonchainURI.json');
    const onchainURIObj = JSON.parse(onchainURIString);
    // (var i = 0; i < MetadataObj.length; i++)
    for (var i = 0; i < MetadataObj.length; i++) {
      console.log("Iteration: ", i)
  
      // var a = new PublicKey('GruSFAjP7gtmJ9k3SBAiCrMXyUByGJKR885MhKWM9KJD') // my wallet 1
      // var a = new PublicKey('2kPsLVoS3u9EodZW1hUVpUFAhQQLeMcFahyANzT2aGYm') // my wallet 2
      // var a = new PublicKey('21kvNoNRZApDBdka11CtzDpftMXzWjrKm4gdYL3DfTY4') // Dan's wallet
      var a = new PublicKey('ciRCL2UY747qxaYNRxJEce9hEL6jojBvBTCmRr2z9mV') // circle authority wallet // recipient
  
  
      const { mintKey, txid } = await mintNFT_for_uploaded_Metadata(a, MetadataObj[i], onchainURIObj[i]);
  
      // fs.writeFileSync("./storage/onchainURI.json", `${JSON.stringify(OnchainURI, null, 2)}\n`, { flag: 'a+' });
      fs.appendFile("./storage/ALLmintIDs.json", `${mintKey},${txid}\n`, function (err) {
        if (err) throw err;
      });
    }
  
  }
  
  // mainMainnet()
  
  
  // export const prepPayForFilesTxn = async (
  //   wallet: WalletSigner,
  //   files: File[],
  // ): Promise<{
  //   instructions: TransactionInstruction[];
  //   signers: Keypair[];
  // }> => {
  //   const memo = programIds().memo;
  
  //   const instructions: TransactionInstruction[] = [];
  //   const signers: Keypair[] = [];
  
  //   if (wallet.publicKey)
  //     instructions.push(
  //       SystemProgram.transfer({
  //         fromPubkey: wallet.publicKey,
  //         toPubkey: AR_SOL_HOLDER_ID,
  //         lamports: await getAssetCostToStore(files),
  //       }),
  //     );
  
  //   for (let i = 0; i < files.length; i++) {
  //     const hashSum = crypto.createHash('sha256');
  //     hashSum.update(await files[i].text());
  //     const hex = hashSum.digest('hex');
  //     instructions.push(
  //       new TransactionInstruction({
  //         keys: [],
  //         programId: memo,
  //         data: Buffer.from(hex),
  //       }),
  //     );
  //   }
  
  //   return {
  //     instructions,
  //     signers,
  //   };
  // };
