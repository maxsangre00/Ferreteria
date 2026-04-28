async function buscar(){

    const empleado = document.getElementById("empleado").value;
    const desde = document.getElementById("desde").value;
    const hasta = document.getElementById("hasta").value;

    let url = `http://localhost:3000/ver-inventarios?empleado=${empleado}&desde=${desde}&hasta=${hasta}`;

    const res = await fetch(url);
    const data = await res.json();

    //  VALIDACIÓN CLAVE
    if(!res.ok){
        console.error("ERROR:", data.error);
        alert("Error en servidor: " + data.error);
        return;
    }
   //  LIMPIAR INPUTS
    document.getElementById("empleado").value = "";
    document.getElementById("desde").value = "";
    document.getElementById("hasta").value = "";
    render(data);
}

function render(data){

    const div = document.getElementById("lista");
    div.innerHTML = "";

    if(data.length === 0){
        div.innerHTML = "<p>No hay resultados</p>";
        return;
    }

    data.forEach(inv => {

        const fecha = new Date(inv.fecha).toLocaleString();

      div.innerHTML += `
<div class="card" onclick="verDetalle(${inv.id_inventario})">
    <b>👤 ${inv.usuario}</b>

    <div class="detalle">
        📅 ${fecha}
    </div>

    <div class="detalle">
        📦 Productos contados: ${inv.total_items}
    </div>
</div>
`;
    });
}
async function verDetalle(id){

    const res = await fetch(`http://localhost:3000/inventario-detalle/${id}`);
    const data = await res.json();

    const div = document.getElementById("detalle");
    div.innerHTML = "";

    if(data.length === 0){
        div.innerHTML = "<p>No hay detalle</p>";
        return;
    }

    data.forEach(p => {

        let color = "white";
        if(p.diferencia < 0) color = "#ef4444";
        if(p.diferencia > 0) color = "#facc15";
        if(p.diferencia === 0) color = "#22c55e";

        div.innerHTML += `
        <div style="border-bottom:1px solid #1e293b; padding:8px 0;">
            <b>${p.nombre}</b><br>
            Sistema: ${p.stock_sistema} | Contado: ${p.stock_contado}<br>
            <span style="color:${color}">
                Diferencia: ${p.diferencia}
            </span>
        </div>
        `;
    });

    document.getElementById("modal").style.display = "block";
}

function cerrarModal(){
    document.getElementById("modal").style.display = "none";
}

function toggleMenu(event){
    event.stopPropagation();

    const menu = document.getElementById("menu");
    menu.classList.toggle("open");
}
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
function irAEstadisticas() {
    window.location.href = "estadisticas.html";
}
function irACrearUsuario(){
    window.location.href = "crearUsuario.html";
}
function irAUsuarios(){
    window.location.href = "listadoUsuarios.html";
}
function verInventarios(){
    window.location.href = "verInventarios.html";
}
window.irATicket = function(){
    window.location.href = "ticket.html";
}
window.irAInventario = function(){
    window.location.href = "inventario.html";
}
document.addEventListener("click", function(e){

    const menu = document.getElementById("menu");
    const boton = document.querySelector(".menu-btn");

    // si el menú está abierto
    if(menu.classList.contains("open")){

        // si el click NO fue dentro del menú ni en el botón
        if(!menu.contains(e.target) && !boton.contains(e.target)){
            menu.classList.remove("open");
        }
    }

});

