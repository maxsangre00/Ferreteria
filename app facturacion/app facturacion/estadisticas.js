// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

    const filtro = document.getElementById("filtro");

    if (!filtro) {
        console.error("❌ No existe #filtro");
        return;
    }

    cargarEstadisticas();
    cargarTopProductos();
    cargarHeatmap();
alertaGanancia();

    filtro.addEventListener("change", () => {
        cargarEstadisticas();
    });

    //  FECHAS POR DEFECTO
    const hoy = new Date();
    const hace7 = new Date();
    hace7.setDate(hoy.getDate() - 7);

    const inputHasta = document.getElementById("hasta");
    const inputDesde = document.getElementById("desde");

    if (inputHasta && inputDesde) {
        inputHasta.value = hoy.toISOString().split("T")[0];
        inputDesde.value = hace7.toISOString().split("T")[0];

        //  cargar gráfico automáticamente
        cargarRango();
    }
});

// ================= CARGAR ESTADISTICAS =================
async function cargarEstadisticas(){

    const filtro = document.getElementById("filtro").value;

    try{

        const res = await fetch(`http://localhost:3000/estadisticas?filtro=${filtro}`);
        const data = await res.json();

        console.log("📊 DATA:", data);

        document.getElementById("ventas").innerText =
            "$" + Number(data.ventas || 0).toLocaleString();

        document.getElementById("ganancia").innerText =
            "$" + Number(data.ganancia || 0).toLocaleString();

    }catch(err){
        console.error("Error cargando estadísticas:", err);
    }
}

// ================= TOP PRODUCTOS =================
let chartTop;

async function cargarTopProductos(){

    try{
        const res = await fetch("http://localhost:3000/top-productos");
        const data = await res.json();

        const nombres = data.map(p => p.nombre);
        const totales = data.map(p => p.total);

        if(chartTop){
            chartTop.destroy();
        }

        const ctx = document.getElementById("graficoTop");

      chartTop = new Chart(ctx, {
    type: "doughnut",
    data: {
        labels: nombres,
        datasets: [{
            data: totales,
            backgroundColor: [
                "#2563eb",
                "#22c55e",
                "#f59e0b",
                "#ef4444",
                "#8b5cf6",
                "#14b8a6"
            ],
            hoverOffset: 20,
            borderWidth: 2
        }]
    },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                },
                cutout: "55%" //  efecto dona 
            }
        });

    }catch(err){
        console.error("Error top productos:", err);
    }
}

let chartLinea;

// ================= RANGO PERSONALIZADO =================
async function cargarRango(){

    const desde = document.getElementById("desde").value;
    const hasta = document.getElementById("hasta").value;

    if(!desde || !hasta){
        alert("Seleccioná ambas fechas");
        return;
    }

    try{

        const res = await fetch(`http://localhost:3000/estadisticas-rango?desde=${desde}&hasta=${hasta}`);
        const data = await res.json();

        console.log("📈 RANGO:", data);

        const fechas = data.map(d => d.fecha);
        const ventas = data.map(d => d.ventas);
        const ganancias = data.map(d => d.ganancia);

        if(chartLinea){
            chartLinea.destroy();
        }

        const ctx = document.getElementById("graficoLinea");

        chartLinea = new Chart(ctx, {
            type: "line",
            data: {
                labels: fechas,
                datasets: [
                    {
                        label: "Ventas",
                        data: ventas,
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37,99,235,0.2)",
                        tension: 0.3
                    },
                    {
                        label: "Ganancia",
                        data: ganancias,
                        borderColor: "#22c55e",
                        backgroundColor: "rgba(34,197,94,0.2)",
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "top"
                    }
                }
            }
        });

    }catch(err){
        console.error("Error rango:", err);
    }
}
async function cargarHeatmap(){

    try{

        const res = await fetch("http://localhost:3000/heatmap");
        const data = await res.json();

        const dias = ["Dom","Lun","Mar","Mie","Jue","Vie","Sab"];

        const cont = document.getElementById("heatmap");
        cont.innerHTML = "";

        // encontrar máximo para escala de color
        const max = Math.max(...data.map(d => d.total || 0), 1);

        for(let i=0;i<7;i++){

            const diaData = data.find(d => d.dia == i);
            const total = diaData ? diaData.total : 0;

            // intensidad color
            const intensidad = total / max;

            const color = `rgba(34,197,94, ${0.2 + intensidad})`;

            cont.innerHTML += `
                <div class="dia" style="background:${color}">
                    ${dias[i]}<br>
                    $${Math.round(total)}
                </div>
            `;
        }

    }catch(err){
        console.error("Error heatmap:", err);
    }
}
async function alertaGanancia(){

    try{

        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(hoy.getDate() - 1);

        const f1 = ayer.toISOString().split("T")[0];
        const f2 = hoy.toISOString().split("T")[0];

        const res = await fetch(`http://localhost:3000/estadisticas-rango?desde=${f1}&hasta=${f2}`);
        const data = await res.json();

        if(data.length < 2) return;

        const hoyData = data[data.length - 1];
        const ayerData = data[data.length - 2];

        const cont = document.getElementById("alerta");

        if(!cont) return;

        if(hoyData.ganancia < ayerData.ganancia){

            cont.innerHTML = "⚠️ La ganancia bajó respecto a ayer";
            cont.style.color = "red";

        } else {

            cont.innerHTML = "✅ Ganancia estable o en crecimiento";
            cont.style.color = "green";
        }

    }catch(err){
        console.error("Error alerta:", err);
    }
}

//===============global=============
document.addEventListener("DOMContentLoaded", () => {

    const menu = document.getElementById("menu");
    const overlay = document.querySelector(".overlay");
    const btnMenu = document.querySelector(".menu-btn");

    //  seguridad anti-error
    if (!menu || !overlay || !btnMenu) {
        console.error("❌ Falta menú, overlay o botón en HTML");
        return;
    }

    window.toggleMenu = function (e) {
        if (e) e.stopPropagation();

        menu.classList.toggle("open");
        overlay.classList.toggle("active");

        btnMenu.style.display = menu.classList.contains("open")
            ? "none"
            : "block";
    };

    overlay.addEventListener("click", () => {
        menu.classList.remove("open");
        overlay.classList.remove("active");

        btnMenu.style.display = "block";
    });

});
document.addEventListener("click", function (event) {

    const menu = document.getElementById("menu");
    const btn = document.querySelector(".menu-btn");

    if (!menu.classList.contains("active")) return;

    if (menu.contains(event.target) || btn.contains(event.target)) return;

    menu.classList.remove("open");
});
window.volverInicio = function(){
    document.body.style.opacity = "0";
    setTimeout(() => window.location.href = "index.html", 200);
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
document.addEventListener("DOMContentLoaded", () => {

    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if (!usuario) {
        // si no hay login  lo mando afuera
        window.location.href = "login.html";
        return;
    }

    //  si NO es admin va a ocultar botones
    if (usuario.rol !== "admin") {

        document.querySelectorAll(".solo-admin").forEach(el => {
            el.style.display = "none";
        });
    }
});
