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
