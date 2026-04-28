

function formatearFecha(fecha) {
    const f = new Date(fecha);

    return f.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
let totalFactura = 0;
let html5QrScanner = null;

const usuario = JSON.parse(localStorage.getItem("usuario"));
const menu = document.getElementById("menu");
const overlay = document.querySelector(".overlay");
const btnMenu = document.querySelector(".menu-btn");
const busqueda = document.getElementById("busqueda");





function toggleMenu(e){
    e.stopPropagation();

    menu.classList.toggle("open");
    overlay.classList.toggle("active");

    btnMenu.classList.toggle("hidden");
}

// cerrar al tocar fuera
if (overlay) {
    overlay.addEventListener("click", () => {
        menu.classList.remove("open");
        overlay.classList.remove("active");
        btnMenu.classList.remove("hidden");
    });
}
// ================= FUNCIONES GLOBALES =================


window.cerrarMenu = function(){
    document.getElementById("menu")?.classList.remove("open");
}

window.irAFacturar = function(){
    window.location.href = "Facturar.html";
    }
    window.irAVentas = function(){
    window.location.href = "ventas.html";
}
window.irAStock = function(){
    window.location.href = "stock.html";
}

window.volverInicio = function(){
    document.body.style.opacity = "0";
    setTimeout(() => window.location.href = "index.html", 200);
}
window.irAPedidos = function(){
    window.location.href = "pedidos.html";
}
window.irAEstadisticas = function(){
    window.location.href = "estadisticas.html";
}
function irACrearUsuario(){
    window.location.href = "crearUsuario.html";
}
function irAUsuarios(){
    window.location.href = "listadoUsuarios.html";
}
window.irAInventario = function(){
    window.location.href = "inventario.html";
}
window.irATicket = function(){
    window.location.href = "ticket.html";
}
function cerrarSesion(){

    localStorage.clear();

    document.body.style.transition = "0.3s";
    document.body.style.opacity = "0";

    setTimeout(() => {
        window.location.href = "loguin.html";
    }, 200);
}
const user= JSON.parse(localStorage.getItem("usuario"));

//  SOLO bloquear si NO estás en login
if(!user && !window.location.pathname.includes("loguin.html")){
    alert("Debes iniciar sesión");
    window.location.href = "loguin.html";
}

// ================= DOM =================
window.addEventListener("DOMContentLoaded", () => {

    const inputBusqueda = document.getElementById('barcode-input');
    const datalist = document.getElementById('sugerencias-productos');
    const listaProductos = document.getElementById('lista-productos');
    const totalDisplay = document.getElementById('total');

    const inputCliente = document.getElementById('cliente-nombre');
    const inputDoc = document.getElementById('cliente-doc');
    const btnFinalizar = document.getElementById("btn-finalizar");
    const startBtn = document.getElementById("start-scan");
const stopBtn = document.getElementById("stop-scan");
const readerContainer = document.getElementById("reader-container");
const lista = document.getElementById("clientes-lista");

startBtn?.addEventListener("click", () => {
    iniciarScanner();
});

stopBtn?.addEventListener("click", () => {
    detenerScanner();
});

    if(btnFinalizar){
        btnFinalizar.addEventListener("click", facturar);
    }

    // ================= PRODUCTOS =================
    inputBusqueda?.addEventListener('input', async (e) => {

        const texto = e.target.value;
        if (texto.length < 1) return;

        try {
            const res = await fetch(`http://localhost:3000/buscar-productos?q=${texto}`);
            const data = await res.json();

            datalist.innerHTML = '';

            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.nombre;
                datalist.appendChild(opt);
            });

        } catch(err){
            console.error(err);
        }
    });

    inputBusqueda?.addEventListener('change', async (e) => {

        const val = e.target.value;
        if (!val) return;

        try {
            const res = await fetch(`http://localhost:3000/buscar-productos?q=${val}`);
            const data = await res.json();

            if (data.length > 0) {
                agregarFila(data[0]); //  PASO TODO AL OBJETO
                inputBusqueda.value = '';
            }

        } catch(err){
            console.error(err);
        }
    });

    //  GUARDA ID DEL PRODUCTO
function agregarFila(prod) {

    console.log("PRODUCTO AGREGADO:", prod);

    const div = document.createElement('div'); // 👈 PRIMERO CREAS

    div.className = 'item';
    div.dataset.precio = prod.precio_venta;
    div.dataset.id = prod.id_producto ?? prod.codigo_barras ?? "";

    console.log("DATASET ID:", div.dataset.id); // 👈 AHORA SÍ EXISTE

    div.innerHTML = `
        <div class="item-name">${prod.nombre}</div>
        <div class="item-bottom">
            <span class="item-subtotal">$${parseFloat(prod.precio_venta).toFixed(2)}</span>
            <div class="item-controls">
                <input type="number" class="item-qty" value="1" min="1">
                <button class="btn-del">✕</button>
            </div>
        </div>`;

    listaProductos.appendChild(div);

    div.querySelector('.item-qty').addEventListener('input', recalcular);
    div.querySelector('.btn-del').addEventListener('click', () => {
        div.remove();
        recalcular();
    });

    recalcular();
}

    function recalcular() {
        totalFactura = 0;

        document.querySelectorAll('.item').forEach(it => {
            const p = parseFloat(it.dataset.precio);
            const q = parseInt(it.querySelector('.item-qty').value) || 1;
            const sub = p * q;

            it.querySelector('.item-subtotal').innerText = `$${sub.toFixed(2)}`;
            totalFactura += sub;
        });

        totalDisplay.innerText = `$${totalFactura.toFixed(2)}`;
    }

// ================= CLIENTES =================
inputCliente?.addEventListener('input', async () => {

    const texto = inputCliente.value.trim();
    if (texto.length < 2) return;

    try {
        const res = await fetch(`http://localhost:3000/buscar-cliente?q=${texto}`);
        const data = await res.json();

        const lista = document.getElementById("clientes-lista");
        lista.innerHTML = "";

        data.forEach(c => {
            const option = document.createElement("option");

            // mostramos ambos
            option.value = `${c.nombre} - ${c.cuit}`;

            option.dataset.nombre = c.nombre;
            option.dataset.cuit = c.cuit;
            option.dataset.telefono = c.telefono;

            lista.appendChild(option);
        });

    } catch (err) {
        console.error("Error clientes:", err);
    }
});
// ================= BUSCAR POR CUIT =================
inputDoc?.addEventListener('input', async () => {

    const cuit = inputDoc.value.trim();

    if (cuit.length < 5) return; // evita consultas innecesarias

    try {
        const res = await fetch(`http://localhost:3000/buscar-cliente?q=${cuit}`);
        const data = await res.json();

        if (data.length > 0) {
            inputCliente.value = data[0].nombre || "";
            inputDoc.value = data[0].cuit || "";

            // guardar teléfono también (para WhatsApp)
            inputCliente.dataset.telefono = data[0].telefono || "";
        }

    } catch (err) {
        console.error("Error buscando por CUIT:", err);
    }
});

// ================= CUANDO SELECCIONA =================
inputCliente?.addEventListener('change', async () => {

    const valor = inputCliente.value.trim();

    if (!valor) return;

    try {
        const res = await fetch(`http://localhost:3000/buscar-cliente?q=${valor}`);
        const data = await res.json();

        if (data.length > 0) {

            inputCliente.value = data[0].nombre;
            inputDoc.value = data[0].cuit || "";

            inputCliente.dataset.telefono = data[0].telefono || "";
        }

    } catch (err) {
        console.error(err);
    }
});

//=====================scaner===================
function iniciarScanner(){

    readerContainer.style.display = "block";

    html5QrScanner = new Html5Qrcode("reader");

    html5QrScanner.start(
        { facingMode: "environment" }, // cámara trasera
        {
            fps: 10,
            qrbox: 250
        },
        (decodedText) => {

            document.getElementById("barcode-input").value = decodedText;

            agregarProductoDesdeCodigo(decodedText);

            detenerScanner();

        },
        (errorMessage) => {
            
        }
    ).catch(err => {
        console.error("Error cámara:", err);
        alert("No se pudo abrir la cámara");
    });
}
function detenerScanner(){
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            html5QrScanner.clear();
            html5QrScanner = null;
        });
    }

    readerContainer.style.display = "none";
}
function agregarProductoDesdeCodigo(codigo){

    fetch(`http://localhost:3000/buscar-productos?q=${codigo}`)
        .then(res => res.json())
        .then(data => {
            if(data.length > 0){
                agregarFila(data[0]);
            }
        });
}

    // ================= FACTURAR =================
  async function facturar() {

    const nombre = inputCliente.value.trim();
    const cuit = inputDoc.value.trim();

    if (!nombre || !cuit) {
        alert("Completar cliente");
        return;
    }

    const itemsDOM = document.querySelectorAll(".item");

    if (itemsDOM.length === 0) {
        alert("No hay productos");
        return;
    }

    //  PRIMERO ARMO ITEMS
    let items = [];

    itemsDOM.forEach(it => {
        items.push({
            id_producto: it.dataset.id,
            cantidad: parseInt(it.querySelector(".item-qty").value),
            precio: parseFloat(it.dataset.precio),
            nombre: it.querySelector(".item-name").innerText
        });
    });

    //   VALIDÁS
    const sinID = items.some(i => !i.id_producto || i.id_producto === "undefined");

    if (sinID) {
        console.log("❌ ITEMS MALOS:", items);
        alert("Hay productos sin ID válido");
        return;
    }

    const data = {
    cliente: { nombre, cuit },
    items,
    total: totalFactura,
usuario: user.nombre};

    try {
        const res = await fetch("http://localhost:3000/facturar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const r = await res.json();

        console.log("📨 RESPUESTA:", r);

        if (r.ok) {
            mostrarTicket(nombre, cuit, r.fecha, items);
        } else {
            alert("Error del servidor");
        }

    } catch (err) {
        console.error(err);
        alert("Error al facturar");
    }
}

    // ================= TICKET =================
   
   window.mostrarTicket = function(nombre, cuit, fecha, items){

    let html = "";

    items.forEach(it => {
        html += `
        <tr>
            <td>${it.nombre}</td>
            <td>${it.cantidad}</td>
            <td>$${it.precio.toFixed(2)}</td>
            <td>$${(it.precio * it.cantidad).toFixed(2)}</td>
        </tr>`;
    });

    const ticket = document.createElement("div");
    ticket.className = "ticket";

    ticket.innerHTML = `
    <div class="factura">

    <button class="btn-cerrar" onclick="cerrarTicket(this)">✖</button>

        <div class="header">
            <div class="ticket-logo">
                <img src="imagenes/fondo1.jpg" alt="logo">
            </div>
            <div class="empresa">
                <h2>FERRETERÍA LA CANDELARIA</h2>
                <p>Dirección: Av. Siempre Viva 123</p>
                <p>Tel: 11-1234-5678</p>
                <p>Email: ventas@lacandelaria.com</p>
            </div>
        </div>

        <hr>

        <div class="info">
    <div>
        <p><b>Cliente:</b> ${nombre}</p>
        <p><b>CUIT:</b> ${cuit}</p>
        <p><b>Atendido por:</b> ${user?.nombre || "Sistema"}</p>
    </div>
            <div>
                <p><b>Fecha:</b> ${new Date(fecha).toLocaleString()}</p>
                <p><b>Factura Nº:</b> ${Math.floor(Math.random()*10000)}</p>
            </div>
        </div>

        <table class="tabla">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${html}
            </tbody>
        </table>

        <div class="total">
            TOTAL: $${totalFactura.toFixed(2)}
        </div>

     <div class="acciones">
    <button onclick="window.print()">🖨️ Imprimir</button>
    <button onclick="descargarPDF()">📄 Descargar PDF</button>
    <button onclick="enviarWhatsApp()">📲 WhatsApp</button>
</div>

    </div>
    `;

    document.body.appendChild(ticket);
}
window.cerrarTicket = function(btn){
    const ticket = btn.closest(".ticket");
    if(ticket) ticket.remove();

    limpiarFactura();
}
function limpiarFactura(){

    // cliente
    document.getElementById("cliente-nombre").value = "";
    document.getElementById("cliente-doc").value = "";

    // productos
    document.getElementById("lista-productos").innerHTML = "";

    // input búsqueda
    document.getElementById("barcode-input").value = "";

    // total
    totalFactura = 0;
    document.getElementById("total").innerText = "$0.00";

    // datalist sugerencias
    document.getElementById("clientes-lista").innerHTML = "";
    document.getElementById("sugerencias-productos").innerHTML = "";
}
//==================whastapp=================
window.enviarWhatsApp = function(){

    let texto = "🧾 *FERRETERÍA LA CANDELARIA*%0A";
    texto += "------------------------%0A";

    texto += "%0A*DETALLE*%0A";

    document.querySelectorAll(".tabla tbody tr").forEach(row => {

        const cols = row.querySelectorAll("td");

        const nombre = cols[0].innerText;
        const cant = cols[1].innerText;
        const subtotal = cols[3].innerText;

        texto += `${nombre} x${cant} → ${subtotal}%0A`;
    });

    texto += "%0A------------------------%0A";
    texto += `*TOTAL: $${totalFactura.toFixed(2)}*`;

    //  USAMOS EL TELEFONO
    let telefono = document.getElementById("cliente-nombre").dataset.telefono;

    if(!telefono){
        alert("El cliente no tiene teléfono cargado");
        return;
    }

    //  FORMATO ARGENTINA (549...)
    telefono = telefono.replace(/\D/g, ""); // limpia todo
    if(!telefono.startsWith("549")){
        telefono = "549" + telefono;
    }

    const url = `https://wa.me/${telefono}?text=${texto}`;

    window.open(url, '_blank');
}
// ================= PDF =================
window.descargarPDF = function(){

    const facturaOriginal = document.querySelector(".factura");

    if(!facturaOriginal){
        alert("No hay factura");
        return;
    }

    //  CLONAR PARA NO ROMPER LA UI
   const factura = facturaOriginal.cloneNode(true);

//  eliminar botones del clon
factura.querySelectorAll(".acciones, .btn-cerrar").forEach(el => el.remove());

const logo = factura.querySelector(".logo img");
if (logo) {
    logo.style.width = "60px";
    logo.style.height = "60px";
    logo.style.maxWidth = "60px";
    logo.style.maxHeight = "60px";
    logo.style.objectFit = "contain";
}

// opcional: evitar scroll raro
factura.style.height = "auto";
factura.style.overflow = "visible";

    //  QUITAR BOTONES DEL CLON 
    const acciones = factura.querySelector(".acciones");
    const cerrar = factura.querySelector(".btn-cerrar");

    if(acciones) acciones.remove();
    if(cerrar) cerrar.remove();

    //  QUE SE VEA TODO 
    factura.style.maxHeight = "none";
    factura.style.overflow = "visible";
    factura.style.height = "auto";

    // contenedor temporal
    const contenedor = document.createElement("div");
    contenedor.appendChild(factura);

    const opt = {
        margin: 5,
        filename: 'factura.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
            scale: 2,
            scrollY: 0
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };

    html2pdf().set(opt).from(contenedor).save();
}
window.imprimirTicket = function(){
    window.print();
}
//==============buscador ventas===============
window.buscar = async function () {

    const codigoEl = document.getElementById("codigo");
    const clienteEl = document.getElementById("cliente");
    const desdeEl = document.getElementById("desde");
    const hastaEl = document.getElementById("hasta");
    const metodoEl = document.getElementById("metodo");
    const estadoEl = document.getElementById("estado");

    const url = `http://localhost:3000/buscar-ventas?codigo=${codigoEl.value}&cliente=${clienteEl.value}&desde=${desdeEl.value}&hasta=${hastaEl.value}&metodo=${metodoEl.value}&estado=${estadoEl.value}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        console.log(data);

        // ================= MOSTRAR TABLA =================
        const tbody = document.getElementById("tabla");
        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7">No hay resultados</td></tr>`;
        }

     data.forEach(v => {
    tbody.innerHTML += `
    <tr onclick="ver(${v.codigo})" class="fila-venta">
        <td>${v.codigo}</td>
        <td>${formatearFecha(v.fechaFactura)}</td>
        <td>${v.cod_cliente}</td>
        <td>$${v.montototal}</td>
    </tr>`;
});

        // ================= LIMPIAR INPUTS =================
        codigoEl.value = "";
        clienteEl.value = "";
        desdeEl.value = "";
        hastaEl.value = "";
        metodoEl.value = "";
        estadoEl.value = "";

    } catch (err) {
        console.error(err);
    }
}
window.ver = async function(id){

    const res = await fetch(`http://localhost:3000/factura/${id}`);
    const data = await res.json();

    console.log("FACTURA COMPLETA:", data);

    mostrarTicketFactura(data.factura, data.items);
}
function formatearFecha(fecha) {
    const f = new Date(fecha);

    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    const anio = f.getFullYear();

    const hora = String(f.getHours()).padStart(2, '0');
    const min = String(f.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${anio} ${hora}:${min}`;
}
function mostrarTicketFactura(factura, items){

    let html = "";

    items.forEach(it => {
        html += `
        <tr>
            <td>${it.nombre}</td>
            <td>${it.cantidad}</td>
            <td>$${it.precioventa.toFixed(2)}</td>
            <td>$${(it.precioventa * it.cantidad).toFixed(2)}</td>
        </tr>`;
    });

    const ventana = window.open("", "_blank", "width=900,height=700");

    ventana.document.write(`
    <html>
    <head>
        <title>Factura ${factura.codigo}</title>

        <style>
            body{
                font-family: 'Segoe UI', Arial, sans-serif;
                background:#f4f6f9;
                margin:0;
                padding:20px;
            }

            .ticket{
                max-width: 750px;
                margin:auto;
                background:#fff;
                padding:25px;
                border-radius:12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }

            .header{
                text-align:center;
                border-bottom:2px solid #eee;
                padding-bottom:15px;
                margin-bottom:15px;
            }

            .header h2{
                margin:0;
                color:#1f2937;
                letter-spacing:1px;
            }

            .info{
                display:flex;
                justify-content:space-between;
                font-size:14px;
                margin-bottom:15px;
                color:#444;
            }

            table{
                width:100%;
                border-collapse:collapse;
                font-size:14px;
            }

            th{
                background:#1f2937;
                color:white;
                padding:10px;
                text-align:left;
                border-radius:4px;
            }

            td{
                padding:10px;
                border-bottom:1px solid #eee;
            }

            tr:hover td{
                background:#f9fafb;
            }

            .total{
                text-align:right;
                margin-top:15px;
                font-size:18px;
                font-weight:bold;
                color:#111827;
                border-top:2px solid #eee;
                padding-top:10px;
            }

            .btns{
                margin-top:20px;
                display:flex;
                justify-content:center;
                gap:10px;
            }

            button{
                padding:10px 15px;
                border:none;
                border-radius:8px;
                cursor:pointer;
                font-weight:bold;
            }

            .print{
                background:#2563eb;
                color:white;
            }

            .close{
                background:#ef4444;
                color:white;
            }

            .print:hover{ background:#1d4ed8; }
            .close:hover{ background:#dc2626; }
        </style>
    </head>

    <body>

    <div class="ticket">

        <div class="header">
            <h2>FERRETERÍA LA CANDELARIA</h2>
            <small>Factura N° ${factura.codigo}</small>
        </div>

      <div class="info">
    <div>
        <p><b>Cliente:</b> ${factura.cod_cliente}</p>
        <p><b>Fecha:</b> ${formatearFecha(factura.fechaFactura)}</p>
        <p><b>Atendido por:</b> ${factura.atendido_por || "Sistema"}</p>
    </div>
    <div>
        <p><b>Estado:</b> ${factura.estado}</p>
        <p><b>Método:</b> ${factura.metodopago}</p>
    </div>
</div>

        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant</th>
                    <th>Precio</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${html}
            </tbody>
        </table>

        <div class="total">
            TOTAL: $${Number(factura.montototal).toFixed(2)}
        </div>

        <div class="btns">
            <button class="print" onclick="window.print()">🖨 Imprimir</button>
            <button class="close" onclick="window.close()">✖ Cerrar</button>
        </div>

    </div>

    </body>
    </html>
    `);

    ventana.document.close();
}


});

let productos = [];

//================== STOCK =====================
window.buscarStock = async function(){

    const texto = document.getElementById("busqueda").value.trim();
    const categoria = document.getElementById("categoria").value;
    const proveedor = document.getElementById("proveedor").value;
    const min = document.getElementById("minPrecio").value;
    const max = document.getElementById("maxPrecio").value;
    const stock = document.getElementById("stock").value;

  if(!texto && !categoria && !proveedor && !min && !max && !stock){
        mostrarMensaje("Aplicá al menos un filtro");
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/buscar-stock?q=${texto}&categoria=${categoria}&proveedor=${proveedor}&min=${min}&max=${max}&stock=${stock}`);
        
        const data = await res.json();

        productos = Array.isArray(data) ? data : [];

        render(productos);
        limpiarFiltros();

    } catch(err){
        console.error(err);
    }
};

function mostrarMensaje(msg){

    const toast = document.getElementById("toast");

    if(!toast) return;

    toast.innerText = msg;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000); // 2 segundos
}
//================== ENTER PARA BUSCAR =====================

document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("busqueda");

    if(input){
        input.addEventListener("keypress", function(e){
            if(e.key === "Enter"){
                buscarStock();
            }
        });
    }

});

//================== RENDER =====================

window.render = function(data){

    const tabla = document.getElementById("tabla-productos");
    tabla.innerHTML = "";

    data.slice(0, 50).forEach(p => {

        let estado = "";
        let color = "";

        if(p.stock <= 10){
            estado = "🔴 Bajo";
            color = "red";
        } else {
            estado = "🟢 Alto";
            color = "limegreen";
        }

        tabla.innerHTML += `
        <tr>
            <td>${p.codigo_barras}</td>
            <td>${p.nombre}</td>
            <td>$${p.precio_venta}</td>
            <td>${p.stock}</td>
            <td style="color:${color}; font-weight:bold;">${estado}</td>
        </tr>`;
    });
};

//================== LIMPIAR =====================
function limpiarFiltros(){

    const b = document.getElementById("busqueda");
    const c = document.getElementById("categoria");
    const p = document.getElementById("proveedor");
    const min = document.getElementById("minPrecio");
    const max = document.getElementById("maxPrecio");
    const s = document.getElementById("stock");

    if(b) b.value = "";
    if(c) c.value = "";
    if(p) p.value = "";
    if(min) min.value = "";
    if(max) max.value = "";
    if(s) s.value = "";
}

//================== FILTROS (SE APLICAN SOLO DESPUÉS DE BUSCAR) =====================

function aplicarFiltros(){

    let data = [...productos];

    const cat = document.getElementById("categoria")?.value;
    const prov = document.getElementById("proveedor")?.value;
    const min = document.getElementById("minPrecio")?.value;
    const max = document.getElementById("maxPrecio")?.value;
    const stock = document.getElementById("stock")?.value;

    if(cat) data = data.filter(p => p.id_categoria == cat);
    if(prov) data = data.filter(p => p.id_proveedor == prov);
    if(min) data = data.filter(p => p.precio_venta >= min);
    if(max) data = data.filter(p => p.precio_venta <= max);

    if(stock === "bajo") data = data.filter(p => p.stock < 5);
    if(stock === "alto") data = data.filter(p => p.stock >= 5);

    render(data);
}

// eventos filtros
["categoria","proveedor","minPrecio","maxPrecio","stock"]
.forEach(id => {
    const el = document.getElementById(id);
    if(el){
       el.addEventListener("change", () => {
    buscarStock();
});
    }
});
//================== BOTÓN BUSCAR =====================
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("btn-buscar");

    if(btn){
        btn.addEventListener("click", buscarStock);
    }
});
//================== ROLES =====================

window.addEventListener("load", aplicarRoles);

function aplicarRoles() {
    const user = JSON.parse(localStorage.getItem("usuario"));

    if(!user){
        window.location.href = "loguin.html";
        return;
    }

    document.querySelectorAll(".solo-admin").forEach(el => {
        el.classList.toggle("hidden", user.rol !== "admin");
    });
}