
// var fs = require('fs'); 
// const electron =require('electron').remote
const fs = require('fs')
// const BrowserWindow = electron.BrowserWindow
// const ErrDiglog = electron.dialog

const bip39 = require('bip39')
var RIPEMD160 = require('ripemd160')
var HDKey = require('hdkey')
var SHA256 = require("crypto-js/sha256");
var EncHex = require("crypto-js/enc-hex");

const base58check = require('base58check')
// const ethUtil = require('ethereumjs-util');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;


function hash160(data){

    //s2562 use crypto-js which is work in frontend
    let s256 = SHA256(EncHex.parse(data.toString('hex')))
    return new RIPEMD160().update(Buffer.from(s256.toString(),'hex')).digest()
}

const CoinIDEnum = Object.freeze({"BTC":0, "ETH":60})
function ConvertCoinIDEnumToString(num){
    switch(num){
        case 0:
            return "BTC"
        case 60:
            return "ETH"
        default:
            return undefined
    }
}



const generateRootKeyFromMnemonic = async(parseArray) =>{
    var myString = parseArray.join(' ');
    const seed = await bip39.mnemonicToSeed(myString); //creates seed buffer by mnemonic
    // console.log("seed", seed.toString('hex'))
    var BIP49_VERSIONS = {private: 0x049D7878, public: 0x049D7CB2}
    const root = HDKey.fromMasterSeed(seed,BIP49_VERSIONS);    // generate root public and private key
    // console.log(root.toJSON())
    return root
}

const generateAddressFromRoot = (root, coinID, account, change, index) =>{
    if(index > 2147483647){
        throw Error("Account can generate address index <= 2147483647")
    }
    
    // //to generate address
    // 1 wallet chain can generate 2147483648 address (0 to 2147483647)
    // m / BIP / coin / account / change / address index
    // coinID BTC = 1, ETH = 60
    const deriveStr = `m/49'/${coinID}'/${account}'/${change}/${index}`
    // const deriveStr = "m/49'/60'/0'/0/0"
    let addrNode = root.derive(deriveStr); //line 1

    // console.log("_publicKey", addrNode._publicKey.toString('hex'))

    const keyhash  = hash160(addrNode._publicKey)
    // console.log("keyhash", keyhash, keyhash.toString('hex'))

    const scriptSig = Buffer.from(("0014" + keyhash.toString('hex')), 'hex')
    const addressBytes  = hash160(scriptSig)
    // console.log("addressBytes", addressBytes, addressBytes.toString('hex'))
    
    let finalAddress = base58check.encode(addressBytes,"05")
    // console.log("finalAddress", finalAddress)
    return {
        deriveStr,
        address:finalAddress, 
    }
}
// const btn2 = this.document.querySelector('#btn2')
function generatePharseTable(totalNumber){
    let total = Number(totalNumber)
    var pharseTableParent = document.getElementById("pharseTable");
    // console.log(pharseTableParent.childNodes)
    for(let j = pharseTableParent.childNodes.length - 1; j >= 0; j--){
        pharseTableParent.removeChild(pharseTableParent.childNodes[j])
    }
    // let count = 0
    for(let i = 0; i < total; i++){
        let divContainer = document.createElement("Div");
        divContainer.setAttribute('class', "parseChild");
        
        let inputLabel = document.createElement("Label");
        inputLabel.setAttribute('for', `mp${i}`);
        inputLabel.innerHTML = `${i+1}.`

        let input = document.createElement("input");
        input.setAttribute('type', 'text');
        input.setAttribute('id', `mp${i}`);

        divContainer.appendChild(inputLabel)
        divContainer.appendChild(input)

        

        pharseTableParent.appendChild(divContainer)
    }
}

const generateAddress = async(parseArray, coinID) =>{
    
    try {
        // console.log("parseArray", parseArray)
        const root = await generateRootKeyFromMnemonic(parseArray)
        // console.log("root", root)

        let totalAddress = 0
        let totalAddressOffset = 0

        let inputTotalAddress = document.getElementById("totalAddress").value
        let inputTotalAddressOffset = document.getElementById("totalAddressOffset").value

        if(inputTotalAddress !== undefined && inputTotalAddress > 0){
            // console.log("inputTotalAddress", inputTotalAddress)
            totalAddress = inputTotalAddress
            // console.log("totalAddress", totalAddress)
        }

        if(inputTotalAddressOffset !== undefined && inputTotalAddressOffset > 0){
            totalAddressOffset = inputTotalAddressOffset
        }

        let totalGeneratedAddress = 0
        let dir = './output';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        while(totalGeneratedAddress < totalAddress){
            let currentRound = Number((totalGeneratedAddress / 1000).toFixed(0)) + 1
            let dataArray = []
            document.getElementById("totalAddressGeneratedLog").textContent = `generating address, process ${currentRound} / ${(Math.ceil(totalAddress / 1000))}`
            let diff = totalAddress - totalGeneratedAddress
            if(diff > 1000){
                diff = 1000
            }
            for(let i = (totalAddressOffset * 1 + totalGeneratedAddress * 1); i < (totalAddressOffset * 1 + totalGeneratedAddress * 1 + diff); i++){
                let {address, deriveStr} = await generateAddressFromRoot(root, coinID, 0, 0,i)
                
                dataArray.push({
                    address, 
                    deriveStr,
                    coin: ConvertCoinIDEnumToString(coinID),
                })
            }
            const filePath = `${dir}/out_${ConvertCoinIDEnumToString(coinID)}_${totalAddress}_${currentRound}.csv`
            const csvWriter = createCsvWriter({
                path: filePath,
                header: [
                {id: 'address', title: 'Address'},
                {id: 'deriveStr', title: 'DeriveStr'},
                {id: 'coin', title: 'Coin'},
                // {id: 'token', title: 'Token'},
                ]
            });
            
            try {
                if(fs.existsSync(filePath)){
                    fs.unlinkSync(filePath)
                }
                
                await csvWriter.writeRecords(dataArray)
                document.getElementById("totalAddressGeneratedLog").textContent = "csv completed."
                totalGeneratedAddress += 1000 * 1
            } catch (error) {
                alert(error)
            }


        }
        confirm("Finish generate address")
        console.log("Finish generate address")
    } catch (error) {
        console.error("error", error)
    }
}

window.onload = async function(){
    // console.log(ErrDiglog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }))
    var pharseNumberConfirmBtn = this.document.querySelector('#pharseNumberConfirmBtn')
    pharseNumberConfirmBtn.onclick = function(){
        var e = document.getElementById("pharseNumber");
        // console.log(`Number is ${e.selectElement.options[e.selectedIndex]}`)
        // console.log("e", e.value)
        generatePharseTable(e.value)
        document.getElementById("generateAddressPanel").style.display="block" 
        
    }

    var generateETHAddressBtn = this.document.querySelector('#generateETHAddressBtn')
    generateETHAddressBtn.onclick = async function(){
        generateETHAddressBtn.disabled = true
        let e = document.getElementById("pharseNumber");
        let totalParse = Number(e.value)
        let mpArray = []
        for(let i = 0; i < totalParse; i++){
            let mp = document.getElementById(`mp${i}`); 
            // console.log("mp", mp.value)
            mpArray.push(mp.value.trim())
        }
        await generateAddress(mpArray, CoinIDEnum.ETH)
        generateETHAddressBtn.disabled = false
    }

    var generateBTCAddressBtn = this.document.querySelector('#generateBTCAddressBtn')
    generateBTCAddressBtn.onclick = async function(){
        generateBTCAddressBtn.disabled = true
        let e = document.getElementById("pharseNumber");
        let totalParse = Number(e.value)
        let mpArray = []
        for(let i = 0; i < totalParse; i++){
            let mp = document.getElementById(`mp${i}`); 
            // console.log("mp", mp.value)
            mpArray.push(mp.value.trim())
        }
        await generateAddress(mpArray, CoinIDEnum.BTC)
        generateBTCAddressBtn.disabled = false
    }



    // const btn = this.document.querySelector('#btn')
    // var mybaby = this.document.querySelector('#mybaby')
    // btn.onclick = function(){
        
    //     fs.readFile('xiaojiejie.txt',(err,data)=>{
    //         mybaby.innerHTML = data
    //     })
    // }

    // const btn2 = this.document.querySelector('#btn2')
    // btn2.onclick = function(){
    //     newWin = new BrowserWindow({
    //         width:500,
    //         height:500,
    //     })
    //     newWin.loadFile('yellow.html')
    //     newWin.on('close',()=>{win=null})
    // }
    
    

} 