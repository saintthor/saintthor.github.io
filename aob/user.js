const HASH_TIMES = 9999;
const CBC_ITERATIONS = 60000;

function ABuff2Base64( ab )
{
    return btoa( String.fromCharCode( ...new Uint8Array( ab )));
}

function Base642ABuff( b64 )
{
    let s = atob( b64 );
    let ua8 = new Uint8Array( s.length );
    s.split( '' ).forEach(( c, i ) => ua8[i] = c.charCodeAt( 0 ));
    return ua8;
}

function UA2Str( ua )
{
    let Rslt = '';
    let len = ua.length;

    for( let i = 0; i < len; i++ )
    {
        let char = ua[i]
        let high = char >> 4;
        if( high < 8 )
        {
            Rslt += String.fromCharCode( char );
        }
        else if( high === 12 || high === 13 )
        {
            let char2 = ua[++i] & 0x3F;
            Rslt += String.fromCharCode((( char & 0x1F ) << 6 ) | char2 );
        }
        else if( high === 14 )
        {
            let char2 = ua[++i] & 0x3F;
            let char3 = ua[++i] & 0x3F;
            Rslt += String.fromCharCode((( char & 0x0F ) << 12 ) | ( char2 << 6 ) | char3 );
        }
    }
    return Rslt;
}

async function Hash( raw, hashName, times )
{
    times = times || 1
    let ua = typeof raw === 'string' ? new TextEncoder( 'utf8' ).encode( raw ) : raw;
    for( ; times-- > 0; )
    {
        ua = await crypto.subtle.digest( { name: hashName }, ua );
    }
    return ua
}

class User
{
    constructor( keys )
    {
        this.OwnChains = new Map();
        this.LocalBlocks = new Map();       //move to Peer?
        this.BlackList = [];
        this.Peers = new Map();
        return ( async () =>
        {
            if( keys )  //load user from imported keys.
            {
                this.PubKeyStr = keys.public;
                this.PubKey = await crypto.subtle.importKey( "raw", Base642ABuff( keys.public ),
                                    { name: "ECDSA", namedCurve: "P-256", }, false, ["verify"]);
                this.PriKey = await crypto.subtle.importKey( "jwk", keys.private,
                                    { name: "ECDSA", namedCurve: "P-256", }, false, ["sign"] );
            }
            else        //new
            {
                let key = await crypto.subtle.generateKey( { name: "ECDSA", namedCurve: "P-256", }, true, ["sign", "verify"] );
                let raw = await crypto.subtle.exportKey( "raw", key.publicKey );
                this.PubKey = key.publicKey;
                this.PriKey = key.privateKey;
                this.PubKeyStr = ABuff2Base64( raw );
            }
            return this;
        } )();
    };

    get Id() { return this.PubKeyStr; };

    async Sign( s, pswd )
    {
        let ua8 = Base642ABuff( s );
        return ABuff2Base64( await crypto.subtle.sign( { name: "ECDSA", hash: { name: "SHA-1" }, }, this.PriKey, ua8 ));
    };

    static async Verify( sig, data, pubKeyS )
    {
        //console.log( 'Verify', this, sig, data, pubKeyS );
        let pubK = await crypto.subtle.importKey( "raw", Base642ABuff( pubKeyS ),
                                { name: "ECDSA", namedCurve: "P-256", }, false, ["verify"] )
        return crypto.subtle.verify( { name: "ECDSA", hash: { name: "SHA-1" }, }, pubK, Base642ABuff( sig ), data );
    };

    static async Import( pswd, encrypted )    //import a key pair to create a user.
    {
        let h512 = await Hash( pswd, 'SHA-512', HASH_TIMES );
        let CBCKey = await crypto.subtle.importKey( 'raw', h512.slice( 0, 32 ), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'] )
                        .then( k => crypto.subtle.deriveKey( { "name": 'PBKDF2', "salt": h512.slice( 32, 48 ),
                                    "iterations": CBC_ITERATIONS, "hash": 'SHA-256' }, k,
                                    { "name": 'AES-CBC', "length": 256 }, true, ["encrypt", "decrypt"] ))
        let Buffer = await crypto.subtle.decrypt( { name: 'AES-CBC', iv: h512.slice( 48, 64 ) }, CBCKey, Base642ABuff( encrypted ));
        let Keys = JSON.parse( UA2Str( new Uint8Array( Buffer )));

        return await new User( Keys );
    };

    async Export( pswd )    //export the key pair.
    {
        let h512 = await Hash( pswd, 'SHA-512', HASH_TIMES );
        let CBCKey = await crypto.subtle.importKey( 'raw', h512.slice( 0, 32 ), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'] )
                        .then( k => crypto.subtle.deriveKey( { "name": 'PBKDF2', "salt": h512.slice( 32, 48 ),
                                    "iterations": CBC_ITERATIONS, "hash": 'SHA-256' }, k,
                                    { "name": 'AES-CBC', "length": 256 }, true, ["encrypt", "decrypt"] ))
        let ExPrivKey = await crypto.subtle.exportKey( "jwk", this.PriKey );
        let Buffer = new TextEncoder( 'utf8' ).encode( JSON.stringify( { 'private': ExPrivKey, 'public': this.PubKeyStr } ));

        return ABuff2Base64( await crypto.subtle.encrypt( { name: 'AES-CBC', iv: h512.slice( 48, 64 ) }, CBCKey, Buffer ));
    };

    async CreateBlock( prevIdx, data, prevId )
    {
        let block = await new Block( prevIdx + 1, data, prevId );
        block.Id = await this.Sign( block.Hash );
        return block;
    };

    GetBlock( blockId )
    {
        return this.LocalBlocks.get( blockId );
    };

    FindRoot( blockId )
    {
        for( let block = this.LocalBlocks.get( blockId ); block; block = this.LocalBlocks.get( blockId ))
        {
            let [idx, name, prevId] = block.GetContentLns( 0, 2, 4 );
            if( idx == 0 )
            {
                return { Id: blockId, Name: name };
            }
            blockId = prevId;
        }
    };

    async RcvBlock( block )
    {
        //console.log( 'RcvBlock', this.Name, block );
        if( this.LocalBlocks.has( block.Id ))
        {
            if( this.LocalBlocks.get( block.Id ).Content !== block.Content )
            {
                throw "bad block data.";
            }
            return;
        }

        let RecvBlock = new Block( block.Index, 0, 0, block.Id, block.Content );
        if( block.Index == 0 )
        {
            if( !await RecvBlock.ChkRoot())
            {
                throw "verify failed.";
            }
        }
        else
        {
            let Prev = this.LocalBlocks.get( RecvBlock.PrevId );
            if( !Prev )
            {
                throw "previous block not found.";
            }
            if( !await RecvBlock.ChkFollow( Prev.OwnerId ))
            {
                throw "verify failed."
            }
        }

        if( block.Index > 0 )
        {
            let PrevBlock = this.LocalBlocks.get( RecvBlock.PrevId );
            let PrevOwner = PrevBlock.OwnerId;
            if( this.BlackList.some( uid => uid == PrevOwner ))
            {
                if( this.Id != PrevOwner )
                {
                    throw "sender in blacklist.";
                }
                return;
            }
            if( !this.ChkTail( PrevBlock ))
            {
                this.BlackList.push( PrevOwner );
                if( this.Id != PrevOwner )
                {
                    throw "double spending."
                }
                return;
            }
        }

        this.LocalBlocks.set( block.Id, RecvBlock );
        let Root = this.FindRoot( block.Id );
        RecvBlock.ChainId = Root.Id;
        if( RecvBlock.OwnerId === this.Id )
        {
            this.OwnChains.set( Root.Id, Root );
        }
        else
        {
            this.OwnChains.delete( Root.Id );
        }
    };

    GetChainBranch( chainid )
    {
        let Branch = [];
        let Queue = [this.LocalBlocks.get( chainid )];
        let Index = 0;
        let InChains = [];
        [...this.LocalBlocks.values()].filter( b => b.ChainId == chainid ).forEach( b => InChains.push( b ));
        //逐层添加区块，以后加分叉
        console.log( InChains );
        while( Queue.length > 0 )
        {
            let CurBlock = Queue.splice( 0, 1 )[0];
            //console.log( Queue.length, CurBlock );
            if( !CurBlock )
            {
                break;
            }
            Branch.push( CurBlock );
            InChains.filter( b => b.Index == CurBlock.Index + 1 && b.PrevId == CurBlock.Id ).forEach( f => Queue.push( f ));
        }
        return Branch;
    };

    ChkTail( block )
    {
        return ![...this.LocalBlocks.values()].find( b => b.PrevId == block.Id );
    };
}
