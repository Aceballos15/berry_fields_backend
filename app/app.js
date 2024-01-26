//modulos requeridos 

const { error, Console } = require('console');
const express = require('express')
const sha = require('js-sha256').sha256; 
const axios = require('axios') 
const cors = require('cors') 

var fechaActual = new Date();

// Obtener el año, mes, día, hora, minutos y segundos
var año = fechaActual.getFullYear();
var mes = fechaActual.getMonth() + 1; // Los meses en JavaScript van de 0 a 11, por lo que se suma 1.
var dia = fechaActual.getDate();
var hora = fechaActual.getHours();
var minutos = fechaActual.getMinutes();
var segundos = fechaActual.getSeconds();
// Formatear la fecha y la hora según tus necesidades
var fechaFormateada = año + '-' + (mes < 10 ? '0' : '') + mes + '-' + (dia < 10 ? '0' : '') + dia;
var horaFormateada = (hora < 10 ? '0' : '') + hora + ':' + (minutos < 10 ? '0' : '') + minutos + ':' + (segundos < 10 ? '0' : '') + segundos;

//asignacion de express a la app 
const app = express();

//lista para el manejo y sonsumo de la api 
const whiteLIst = [
    "https://da94-190-0-247-117.ngrok-free.app/api/Signature", 
    "http://127.0.0.1:3000" ,
    "http://localhost:4000"
]; 

//Funcion para dar o degenar el permiso al consumo de la api 
const cosrOptions = {
    origin: (origin, callback)=>{
        if(whiteLIst.indexOf(origin) !== -1 || !origin){
            callback(null, true ); 
        }
        else{
            callback(new Error('NOT allowed by CORS'))
        }
    }, 
}; 
app.use(cors(cosrOptions)) 

app.use(cors()); 


let DATA = [] 

app.use(express.json()); 

//Post para recibir y procesar la info del carrito 
app.post('/api/Signature', (req, res)=>{  
    try{
        const dsData = req.body
        const number = Math.random()*100000 

        const pars = parseInt(number) 
        
        //Datos obligatorios de wompi 
        const key = "test_integrity_EuMXLUjF7hmJOsUUZ7uFFtcUVXzOxdIa"; 
        const currency = "COP"; 
        const reference = "BF" + number + fechaFormateada + horaFormateada;  
        const amount = dsData.amount * 100; 
        const params = reference + amount + currency + key;  
        const public_key = "pub_test_nhoUd3AyHBCMEbX7W3nq8SSAGr3g622b"; 

        console.log(params) 
        
        //utilizar sha256 para encriptar los datos y hacer la signature 
        const signature = sha(params)
        
        const data = [
            {
                key : key, 
                currency : currency,
                reference : reference,
                amount: amount, 
                signature : signature,
                public_key:public_key
            }
        ]
    
        DATA.push(data) 
        res.status(200).send(data)
        console.log(DATA) 
    }
    catch(error){
        console.error(error) 
        res.status(500).send({error: 'Internal server error'})
    }
})


//Api para nidum y traer los datos que devuelve wompi 
app.post('/api/res/nidum', (req, res)=>{
    const response =  req.body
    const respuesta = 
        {
            amount_in_cents: response.amount_in_cents, 
            reference: "BF" + response.reference, 
            currency: response.currency, 
            payment_method_type: response.payment_method_type, 
            status: response.status, 
            checksum: response.checksum
        }
    
    wompi.push(respuesta) 
    res.sendStatus(200) 

    respuesta.forEach(data =>{
        estado = data.status 

        if(estado == 'Aceptado'){

            URL_BERRY = "https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/Pedidos_Berry_Fields"
        
            const post = {
                headers: {
                    'Content-Type' : 'Application/json'
                }, 
                body: JSON.stringify(respuesta) 
            }
        
            axios.post(URL_BERRY, post)
        }
    })

    //procesamiento de los datos para luego mandarlos a zoho y alli crear la factura 
})

let wompi = []

//Api para mandar la info a los servidores de la whitelist 
app.get('/api/simonSignature_data', (req, res)=>{

    res.send(DATA)
}) 

//Escuchar el puerto en el que se van a ejecutar los datos
const port = process.env.port || 4000; 

app.listen(port, ()=> console.log(`Escuchando el puerto ${port}`))