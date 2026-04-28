const user = JSON.parse(localStorage.getItem("usuario"));

if(!user || user.rol !== "admin"){
    const btn = document.getElementById("btnVerInventarios");
    if(btn) btn.style.display = "none";
}

let productos = [];
let inventario = [];

function mostrarToast(msg, tipo="ok"){

    const toast = document.createElement("div");
    toast.innerText = msg;

    toast.className = "toast show"; //  usa CSS

    if(tipo === "ok"){
        toast.classList.add("success");
    }else{
        toast.classList.add("error");
    }

    document.body.appendChild(toast);

    setTimeout(()=>{
        toast.classList.remove("show");
        setTimeout(()=>toast.remove(), 300);
    }, 2000);
}


// ================= CARGAR FILTROS =================
async function init(){

    const prov = await fetch("http://localhost:3000/proveedores").then(r=>r.json());
    const rub = await fetch("http://localhost:3000/rubros").then(r=>r.json());

    const selP = document.getElementById("proveedor");
    const selR = document.getElementById("rubro");

    selP.innerHTML = `<option value="">Proveedor</option>`;
    selR.innerHTML = `<option value="">Rubro</option>`;

    prov.forEach(p=>{
        selP.innerHTML += `<option value="${p.id_proveedor}">${p.nombre}</option>`;
    });

    rub.forEach(r=>{
        selR.innerHTML += `<option value="${r.rubro_nombre}">${r.rubro_nombre}</option>`;
    });
}

init();

// ================= CARGAR PRODUCTOS =================
async function cargar(){

    //  limpiar todo antes de traer datos
    inventario = [];
    productos = [];

    document.getElementById("lista").innerHTML = "";

    let data = await fetch("http://localhost:3000/productos").then(r=>r.json());

    const proveedor = document.getElementById("proveedor").value;
    const rubro = document.getElementById("rubro").value;

    if(proveedor){
        data = data.filter(p => p.id_proveedor == proveedor);
    }

    if(rubro){
        data = data.filter(p => p.rubro_nombre == rubro);
    }

    productos = data;

    render();

    document.querySelectorAll("[id^='diff-']").forEach(d => d.innerHTML = "");
}
// ================= RENDER =================
function render(){

    const div = document.getElementById("lista");
    div.innerHTML = "";

    productos.forEach((p, index)=>{

       div.innerHTML += `
<div class="item">

    <b>${p.nombre}</b>

    <div class="row">
        ${user.rol === "admin" ? `Stock: ${p.stock}` : ""}
        
        <input 
            type="number" 
            value=""
            placeholder="Contado"
            oninput="calcular(${index}, this.value)"
            onkeydown="next(event, ${index})"
        />
    </div>

    ${user.rol === "admin" ? `<div id="diff-${index}"></div>` : ""}

</div>
`;
    });

    const primerInput = document.querySelector("#lista input");
    if(primerInput) primerInput.focus();
}

// ================= DIFERENCIA =================
function calcular(i, valor){

    const p = productos[i];
    const contado = parseInt(valor || 0);

    const diff = contado - p.stock;

    inventario[i] = {
        id_producto: p.id_producto,
        stock_sistema: p.stock,
        stock_contado: contado,
        diferencia: diff
    };

    //  SOLO ADMIN VE DIFERENCIA
    if(user.rol !== "admin") return;

    let texto = "";

    if(diff === 0) texto = `<span class="diff-ok">OK</span>`;
    if(diff < 0) texto = `<span class="diff-neg">${diff}</span>`;
    if(diff > 0) texto = `<span class="diff-pos">+${diff}</span>`;

    document.getElementById(`diff-${i}`).innerHTML = texto;
}
// ================= ENTER SIGUIENTE =================
function next(e, i){

    if(e.key === "Enter"){
const inputs = document.querySelectorAll("input");
        if(inputs[i+1]) inputs[i+1].focus();
    }
}

// ================= GUARDAR =================
async function guardar(){

    const datos = inventario.filter(i => i); //  LIMPIA VACÍOS

    if(datos.length === 0){
        mostrarToast("No hay datos", "error");
        return;
    }

    console.log("ENVIANDO INVENTARIO:", datos); //  DEBUG

    const res = await fetch("http://localhost:3000/guardar-inventario", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
            items: datos,
            usuario: user?.nombre || "Desconocido" //  evita error si user es null
        })
    });

    const data = await res.json();

    if(!data.ok){
        mostrarToast("Error al guardar", "error");
        return;
    }

mostrarToast("✅ Inventario guardado", "ok");
    // limpiar
    document.getElementById("lista").innerHTML = "";
    document.getElementById("proveedor").value = "";
    document.getElementById("rubro").value = "";

    inventario = [];
    productos = [];
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
