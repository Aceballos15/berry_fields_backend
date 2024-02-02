const crypto = require('crypto'); 
const sha256 = require('js-sha256'); 

const assignChecksum = async(response)=>{ 

    try{
        //Se trae las propiedades de la respuesta de wompi 
        const properties = response.signature.properties; 
        const params = new Map(); 
        const secret = process.env.EVENT; 

        //Se agrega en un mapa para hacer el recorrido dentro de el mismo 

        params.set('transaction.id', response.data.transaction.id)
        params.set('transaction.status', response.data.transaction.status)
        params.set('transaction.amount_in_cents', response.data.transaction.amount_in_cents)

        let concatenatedString = ""; 

        //Se hace un recorrido a las propiedades y se saca la manera en como wompi encripto los datos 

        for(let i = 0; i<properties.length; i++){
            const property = properties[i]; 
            console.log(property) 
            concatenatedString += params.get(property) 
        }

        //Se termina de concatenar la cadena 

        concatenatedString += response.timestamp; 
        concatenatedString += secret; 

        //Se encriptan los datos 

        const sha256Hash = crypto.createHash("sha256").update(concatenatedString,"utf-8").digest("hex"); 
        return sha256Hash 

    }
    catch(error){
        console.error('Error al general chesum', error)
    }

}

module.exports = assignChecksum; 