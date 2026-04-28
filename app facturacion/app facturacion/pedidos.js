let productos = [];
let proveedores = [];
let pedido = [];
let rubros = [];

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    cargarProveedores();
    cargarRubros();
    cargarStocks();   
});

// ================= CARGAR PROVEEDORES =================
async function cargarProveedores(){
    try{
        const res = await fetch("http://localhost:3000/proveedores");
        proveedores = await res.json();

        const select = document.getElementById("proveedorFiltro");

        if(!select){
            console.error("❌ No existe proveedorFiltro");
            return;
        }

        select.innerHTML = `<option value="">Todos los proveedores</option>`;

        proveedores.forEach(p=>{
            select.innerHTML += `<option value="${p.id_proveedor}">${p.nombre}</option>`;
        });

    }catch(err){
        console.error("Error cargando proveedores:", err);
    }
}
async function cargarRubros(){
    try {
        const res = await fetch("http://localhost:3000/rubros");

        if(!res.ok){
            throw new Error("No existe endpoint /rubros");
        }

        const data = await res.json();

        const select = document.getElementById("rubroFiltro");

        select.innerHTML = `<option value="">Todos los rubros</option>`;

        data.forEach(r => {
            select.innerHTML += `<option value="${r.rubro_nombre}">${r.rubro_nombre}</option>`;
        });

    } catch(err){
        console.error("Error cargando rubros:", err);
    }
}

// ================= BUSCAR =================
window.buscarProductos = async function(){

    const texto = document.getElementById("buscar").value.trim();
    const proveedor = document.getElementById("proveedorFiltro").value;
    const rubro = document.getElementById("rubroFiltro").value;
    const stock = document.getElementById("stockFiltro").value;

    try {
        const res = await fetch("http://localhost:3000/productos");
        let data = await res.json();

        //  TEXTO
        if(texto){
            data = data.filter(p =>
                p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
                String(p.codigo_barras).includes(texto)
            );
        }

        //  PROVEEDOR
        if(proveedor){
            data = data.filter(p => p.id_proveedor == proveedor);
        }

        //  RUBRO 
       if(rubro){
    const res = await fetch(`http://localhost:3000/productos-por-rubro?rubro=${rubro}`);
    data = await res.json();
}

        //  STOCK 
      if(stock){
    data = data.filter(p => p.stock == parseInt(stock));
}

        productos = data;
        renderResultados(data);

        if(data.length === 0){
mostrarToast("No se encontraron productos");        }

        // limpiar
        document.getElementById("buscar").value = "";
        document.getElementById("proveedorFiltro").value = "";
        document.getElementById("rubroFiltro").value = "";
        document.getElementById("stockFiltro").value = "";

    } catch(err){
        console.error("Error:", err);
    }
}
// ================= RENDER PRODUCTOS =================
function renderResultados(data){

    const div = document.getElementById("resultados");
    div.innerHTML = "";

    data.forEach(p => {

        div.innerHTML += `
        <div class="producto">

          <div class="info">
    <b>${p.nombre}</b>
</div>

            <div class="fila-controles">

                <span class="stock-mini">
                    Stock: ${p.stock}
                </span>

                <select id="unidad-${p.id_producto}">
                    <option value="unidad">Unidad</option>
                    <option value="bulto">Bulto</option>
                    <option value="pack">Pack</option>
                </select>

                <input type="number" min="1" value="1" id="cant-${p.id_producto}">

                <button onclick="agregarPedido(${p.id_producto})">➕</button>

            </div>

        </div>`;
    });
}

// ================= AGREGAR =================
window.agregarPedido = function(id){

    const prod = productos.find(p => p.id_producto == id);
    const cant = parseInt(document.getElementById(`cant-${id}`).value);
    const unidad = document.getElementById(`unidad-${id}`).value;
    const titulo = document.getElementById("proveedor-actual");

    if(pedido.length > 0){
        titulo.innerText = "Proveedor: " + pedido[0].proveedor_nombre;
    } else {
        titulo.innerText = "";
    }

    if(!prod){
        mostrarToast("Producto no encontrado");
        return;
    }

    const proveedor = proveedores.find(p => p.id_proveedor == prod.id_proveedor);

    if(pedido.length > 0){
        const proveedorActual = pedido[0].id_proveedor;

        if(prod.id_proveedor != proveedorActual){
            mostrarToast("⚠️ Solo podés usar un proveedor");
            return;
        }
    }

    pedido.push({
        ...prod,
        cantidad: cant,
        unidad: unidad,
        id_proveedor: prod.id_proveedor,
        proveedor_nombre: proveedor?.nombre || "Proveedor"
    });

    mostrarToast("Producto agregado");
    renderPedido();
}
// ================= RENDER PEDIDO =================
function renderPedido(){

    const div = document.getElementById("lista-pedido");
    div.innerHTML = "";

    pedido.forEach((p, i) => {

        div.innerHTML += `
        <div class="pedido-item">
            <b>${p.nombre}</b><br>
           Cantidad: ${p.cantidad} (${p.unidad})<br>
            Proveedor: ${p.proveedor_nombre}

            <button onclick="eliminarItem(${i})">❌</button>
        </div>`;
    });
}

window.eliminarItem = function(index){

    pedido.splice(index, 1);
    renderPedido();
    mostrarToast("Producto eliminado");
}
// ================= GENERAR PDF =================
window.generarPDF = async function () {

      if (pedido.length === 0) {
        mostrarToast("No hay productos");
        return;
    }

    const grupos = {};

    pedido.forEach(p => {
        if (!p.id_proveedor) return;

        if (!grupos[p.id_proveedor]) {
            grupos[p.id_proveedor] = [];
        }

        grupos[p.id_proveedor].push(p);
    });

    for (const idProv of Object.keys(grupos)) {

        const prov = proveedores.find(p => p.id_proveedor == idProv);

        let html = `
        <html>
        <head>
            <title>Pedido</title>
            <style>
                body{
                    font-family: Arial;
                    padding:20px;
                    color:black;
                }

                .header{
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:10px;
                    margin-bottom:10px;
                }

                .header img{
                    width:50px;
                    height:50px;
                    object-fit:contain;
                }

                .header h1{
                    margin:0;
                    font-size:22px;
                }

                h2{
                    text-align:center;
                    margin:5px;
                }

                .fecha{
                    text-align:right;
                    margin-bottom:10px;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                    margin-top:10px;
                }

                th, td{
                    border:1px solid black;
                    padding:8px;
                }

                th{
                    background:#eee;
                }
            </style>
        </head>
        <body>

            <div class="header">
                <img src="imagenes/fondo1.jpg">
                <h1>Ferretería La Candelaria</h1>
            </div>

            <h2>Pedido a: ${prov?.nombre || "Proveedor"}</h2>

            <div class="fecha">
                Fecha: ${new Date().toLocaleDateString()}
            </div>

            <table>
    <tr>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Unidad</th>
    </tr>
        `;

grupos[idProv].forEach(p => {
    html += `
        <tr>
            <td>${p.nombre}</td>
            <td style="text-align:center;">${p.cantidad}</td>
            <td style="text-align:center;">${p.unidad || "unidad"}</td>
        </tr>`;
});

        html += `
            </table>
        </body>
        </html>
        `;

        const ventana = window.open("", "_blank");

        ventana.document.open();
        ventana.document.write(html);
        ventana.document.close();

   ventana.onload = () => {
    setTimeout(() => {
        ventana.focus();
        ventana.print();

        setTimeout(() => {
            ventana.close();
            limpiarPedido();
        }, 500);

    }, 300);
};
    }
}

function limpiarPedido(){
    pedido = [];
    renderPedido();

    const titulo = document.getElementById("proveedor-actual");
    if(titulo) titulo.innerText = "";
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
window.irAPedidos = function(){
    window.location.href = "pedidos.html";
}
window.irAEstadisticas = function(){
    window.location.href = "estadisticas.html";
}
window.irAInventario = function(){
    window.location.href = "inventario.html";
}
function irACrearUsuario(){
    window.location.href = "crearUsuario.html";
}
function irAUsuarios(){
    window.location.href = "listadoUsuarios.html";
}
window.irATicket = function(){
    window.location.href = "ticket.html";
}

window.volverInicio = function(){
    document.body.style.opacity = "0";
    setTimeout(() => window.location.href = "index.html", 200);
}
window.addEventListener("load", () => {

    const user = JSON.parse(localStorage.getItem("usuario"));

    if(!user){
        window.location.href = "loguin.html";
        return;
    }

    //  ocultar botones solo admin ve
    if(user.rol !== "admin"){

        document.querySelectorAll(".solo-admin").forEach(el => {
            el.style.display = "none";
        });

    }

});

   document.addEventListener("DOMContentLoaded", () => {

    const menu = document.getElementById("menu");
    const overlay = document.querySelector(".overlay");
    const btnMenu = document.querySelector(".menu-btn");

    if (!menu || !overlay || !btnMenu) {
        console.warn("⚠️ Menú no encontrado en esta página");
        return;
    }

    window.toggleMenu = function (e) {
        if (e) e.stopPropagation();

        menu.classList.toggle("open");
        overlay.classList.toggle("active");

        btnMenu.classList.toggle("hidden");
    };

    overlay.addEventListener("click", () => {
        menu.classList.remove("open");
        overlay.classList.remove("active");

        btnMenu.classList.remove("hidden");
    });

});
function mostrarToast(mensaje){

    let toast = document.getElementById("toast");

    //  si no existe lo crea (evita errores)
    if(!toast){
        toast = document.createElement("div");
        toast.id = "toast";
        document.body.appendChild(toast);

        toast.style.position = "fixed";
        toast.style.top = "50%";
        toast.style.left = "50%";
        toast.style.transform = "translate(-50%, -50%) scale(0.9)";
        toast.style.background = "rgba(0,0,0,0.7)";
        toast.style.color = "white";
        toast.style.padding = "15px 25px";
        toast.style.borderRadius = "12px";
        toast.style.fontSize = "16px";
        toast.style.textAlign = "center";
        toast.style.opacity = "0";
        toast.style.transition = "all 0.3s ease";
        toast.style.zIndex = "9999";
    }

    toast.innerText = mensaje;
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, -50%) scale(1)";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translate(-50%, -50%) scale(0.9)";
    }, 2000);
}
async function cargarStocks(){
    try{
        const res = await fetch("http://localhost:3000/stocks-unicos");
        const data = await res.json();

        const select = document.getElementById("stockFiltro");

        select.innerHTML = `<option value="">Stock</option>`;

        data.forEach(s => {
            select.innerHTML += `<option value="${s.stock}">${s.stock}</option>`;
        });

    }catch(err){
        console.error("Error cargando stocks:", err);
    }
}
