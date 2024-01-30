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
// const whiteLIst = [
//     "https://da94-190-0-247-117.ngrok-free.app/api/Signature", 
//     "http://127.0.0.1:3000" ,
//     "http://localhost:4000"
// ]; 

// //Funcion para dar o degenar el permiso al consumo de la api 
// const cosrOptions = {
//     origin: (origin, callback)=>{
//         if(whiteLIst.indexOf(origin) !== -1 || !origin){
//             callback(null, true ); 
//         }
//         else{
//             callback(new Error('NOT allowed by CORS'))
//         }
//     }, 
// }; 
// app.use(cors(cosrOptions)) 

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
        const reference = "BFS" + number + fechaFormateada + horaFormateada + dsData.ID; 
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

let DataBerry = []

//Api para nidum y traer los datos que devuelve wompi 
app.post('/api/res/nidum', async (req, res)=>{
    const response =  req.body
    const respuesta = 
        {
            amount_in_cents: response.amount_in_cents, 
            reference: response.reference, 
            Currency: response.Currency, 
            payment_method_type: response.payment_method_type, 
            status: response.status, 
            checksum: response.checksum, 
        }
    
    wompi.push(respuesta) 
    res.sendStatus(200)

    if(response.status === 'APROVED'){

        const Ref = response.reference

        URL_BERRY_GET = `https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/verificar_pedido_Report?where=Referencia=="${Ref}"` 

        URL_FACTURACION = "https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/Remision" 

        await axios.get(URL_BERRY_GET)
        .then((res)=>{
            DataBerry = res.data  
        })
        .catch((error) => console.error(error)) 

        let Product = [] 
        var productos = []
        let Fecha = [] 
        let ID = 0
        let Total = [] 

        productos = JSON.parse(DataBerry[0].Productos)

        DataBerry.forEach(datos =>{
            ID = datos.ID1  
            Fecha =  datos.Fecha
            Total = datos.Total 
        })



        productos.forEach(datos =>{
            const product = {
                Producto : datos['id'],  
                Cantidad: datos['quantity'], 
                Precio: datos['price'],  
                IVA: 0, 
                Total: datos.quantity * datos.price, 
                Utilidad: 0, 
                Cargo_por_venta: 0, 
                Asesor: "1889220000132110360"
            }

            Product.push(product)  
        })

        const factura = {
            Cliente: ID, 
            Zona : "1889220000130974457", 
            Tipo_Factura: "Contado", 
            Aseso: "1889220000132110360", 
            Financieras : "1889220000132747937", 
            Bodega: "1889220000131977652", 
            Redes2: "No", 
            Fecha: Fecha, 
            Vendedor: "1889220000131684707", 
            Subtotal: Total,
            Total: Total,
            Iva_Total : 0, 
            RT_Pago_Digital: 0, 
            Otras_Deducciones: 0, 
            Observacion: " ", 
            Cargo_por_ventas: 0, 
            Rete_Iva: 0, 
            Rete_Fuente: 0, 
            Rete_Ica: 0, 
            Envio : 0,
            Cuenta: "1889220000132525460",
            Item: Product
        }

        console.log(factura) 
        axios.post(URL_FACTURACION, factura)  
        .then((res) =>{
            console.log(res)   
            console.log('La factura fue creada') 
        }) 
        .catch((error)=>{
            console.error(error)
        }) 
    }
})

let wompi = []

//Api para mandar la info a los servidores de la whitelist 
app.get('/api/simonSignature_data', (req, res)=>{

    res.send(DATA)
}) 

//Escuchar el puerto en el que se van a ejecutar los datos
const port = process.env.port || 4000; 

app.listen(port, ()=> console.log(`Escuchando el puerto ${port}`))