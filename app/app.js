//modulos requeridos
const express = require("express");
const sha = require("js-sha256").sha256;
const axios = require("axios");
const cors = require("cors");
const assignChecksum = require("./cheksum");

//importacion de modulos

var fechaActual = new Date();

// Obtener el año, mes, día, hora, minutos y segundos
var año = fechaActual.getFullYear();
var mes = fechaActual.getMonth() + 1; // Los meses en JavaScript van de 0 a 11, por lo que se suma 1.
var dia = fechaActual.getDate();
var hora = fechaActual.getHours();
var minutos = fechaActual.getMinutes();
var segundos = fechaActual.getSeconds();
// Formatear la fecha y la hora según tus necesidades
var fechaFormateada =
  año + "-" + (mes < 10 ? "0" : "") + mes + "-" + (dia < 10 ? "0" : "") + dia;
var horaFormateada =
  (hora < 10 ? "0" : "") +
  hora +
  ":" +
  (minutos < 10 ? "0" : "") +
  minutos +
  ":" +
  (segundos < 10 ? "0" : "") +
  segundos;

//asignacion de express a la app
const app = express();

app.use(cors());

let DATA = [];

app.use(express.json());

//Post para recibir y procesar la info del carrito
app.post("/api/Signature", (req, res) => {
  try {
    const dsData = req.body;
    const number = Math.random() * 100000;

    //Datos obligatorios de wompi
    const key = process.env.KEY;
    const currency = "COP";
    const reference = `bfs-${number}-${fechaFormateada}-${horaFormateada}-${dsData.ID}`;
    const amount = dsData.amount * 100;
    const params = reference + amount + currency + key;
    const public_key = process.env.PUBLIC_KEY;

    //utilizar sha256 para encriptar los datos y hacer la signature
    const signature = sha(params);

    const data = [
      {
        key: process.env.KEY,
        currency: currency,
        reference: reference,
        amount: amount,
        signature: signature,
        public_key: process.env.PUBLIC_KEY,
      },
    ];

    DATA.push(data);
    res.status(200).send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

let wompi = [];

let DataBerry = [];

//Api para nidum y traer los datos que devuelve wompi
app.post("/api/res/nidum", async (req, res) => {
  //Respuesta de la api
  const response = req.body;
  const respuesta = {
    amount_in_cents: response.amount_in_cents,
    reference: response.reference,
    Currency: response.Currency,
    payment_method_type: response.payment_method_type,
    status: response.status,
    checksum: response.checksum,
  };

  wompi.push(respuesta);

  //llamado a la funcion de validacion de cheksum
  const checksum = await assignChecksum(response);

  console.log(JSON.stringify(response));

  //Validacion para facturacion
  if (response.signature.checksum === checksum) {
    const Status = response.data.transaction.status;
    try {
      const Ref = response.data.transaction.reference;

      URL_BERRY_GET = `https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/verificar_pedido_Report?where=Referencia=="${Ref}"`;

      var Pedido = [];

      await axios.get(URL_BERRY_GET).then((res) => {
        Pedido = res.data;
      });

      if(Pedido.length > 0){
        
            URL_PATCH = `https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/verificar_pedido_Report/${Pedido[0].ID}`;
            const Estado = {
              Estado: Status,
            };
      
            axios
              .patch(URL_PATCH, Estado)
              .then(
                (res) => res,
                console.log(res.statusCode, `Update order status ${Status}`)
              );
      }
      res.status(200).send("Pay received"); 
    } catch (err) {
      console.error("Patch status faild", err);
    }

    if (response.data.transaction.status === "APPROVED") {
      const Ref = response.data.transaction.reference;

      //URL para la busqueda de los productos en zoho
      URL_BERRY_GET = `https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/verificar_pedido_Report?where=Referencia=="${Ref}"`;

      URL_FACTURACION =
        "https://nexyapp-f3a65a020e2a.herokuapp.com/zoho/v1/console/Remision";

      //Traer los productos de berry
      await axios
        .get(URL_BERRY_GET)
        .then((res) => {
          DataBerry = res.data;
        })
        .catch((error) => console.error(error));

      let Product = [];
      let productos = [];
      let Fecha = [];
      let ID = 0;
      let Total = [];
      let Direccion = [];

      if (DataBerry.length > 0) {
        productos = JSON.parse(DataBerry[0].Productos);

        DataBerry.forEach((datos) => {
          ID = datos.ID1;
          Fecha = datos.Fecha;
          Total = datos.Total;
          Direccion = datos.Direccion;
        });

        productos.forEach((datos) => {
          const product = {
            Producto: datos["id"],
            Cantidad: datos["quantity"],
            Precio: datos["price"],
            IVA: 0,
            Total: datos.quantity * datos.price,
            Utilidad: 0,
            Cargo_por_venta: 0,
            Asesor: "1889220000132110360",
          };

          Product.push(product);
        });

        // Informar Creación de factura
        console.log("Generating invoice...");

        const factura = {
          Cliente: parseInt(ID),
          Zona: "1889220000130974457",
          Tipo_Factura: "Contado",
          Aseso: "1889220000132110360",
          Financieras: "1889220000132747937",
          Bodega: "1889220000131977652",
          Redes2: "No",
          Fecha: Fecha,
          Vendedor: "1889220000131684707",
          Subtotal: Total,
          Total: Total,
          Iva_Total: 0,
          RT_Pago_Digital: 0,
          Otras_Deducciones: 0,
          Observacion: `Enviar a: ${Direccion}`,
          Cargo_por_ventas: 0,
          Rete_Iva: 0,
          Rete_Fuente: 0,
          Rete_Ica: 0,
          Envio: 0,
          Cuenta: "1889220000132525460",
          Item: Product,
        };
        //Creacion de la factura
        console.log(factura); 
        axios
          .post(URL_FACTURACION, factura)
          .then((res) => {
            console.log("La Factura fue creada correctamente", res.data);
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        console.log("This invoice isn't berry fields order");
      }
    } else {
      console.log(response.data);
      console.log("No Aproved");
    }
  } else {
    console.log("Ocurrio un problema de seguridad...");
  }
});

//Escuchar el puerto en el que se van a ejecutar los datos
const port = process.env.PORT || 4000;

app.listen(port, () => console.log(`Escuchando el puerto ${port}`));
