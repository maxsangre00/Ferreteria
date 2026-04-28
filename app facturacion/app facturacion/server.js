const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express(); // ✅ ESTO FALTABA O ESTÁ MAL UBICADO

app.use(express.json());
app.use("/imagenes", express.static(path.join(__dirname, "imagenes")));
app.use(cors());
app.use(express.static(__dirname));

//  ROOT
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "loguin.html"));
});



// CONEXIÓN A DB
const dbPath = "C:/Users/user/Desktop/app facturacion/app facturacion/app facturacion/Facturacion.db";

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ Error al abrir DB:", err.message);
    } else {
        console.log("✅ Conectado a la base en:");
        console.log(dbPath);
    }
});
console.log("📌 DIRECTORIO ACTUAL SERVER:", __dirname);
console.log("📌 DB PATH USADO:", dbPath);
console.log("DB ABIERTA EN:", dbPath);
db.all("SELECT * FROM cliente", [], (err, rows) => {
    if (err) {
        console.error("ERROR CONSULTA:", err.message);
    } else {
        console.log("🔥 CLIENTES EN ESTA DB:", rows);
    }
});
db.all("SELECT nombre, cuit FROM cliente", [], (err, rows) => {
    console.log("CLIENTES EN DB:", rows);
});

// CREAR TABLA USUARIO
db.run(`
CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT UNIQUE,
    password TEXT,
    telefono TEXT,
    rol TEXT
)
`);

// CREAR TABLA USUARIO
db.run(`
CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT UNIQUE,
    password TEXT,
    telefono TEXT,
    rol TEXT
)
`);
db.run(`
CREATE TABLE IF NOT EXISTS inventario (
    id_inventario INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT,
    fecha TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS inventario_detalle (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_inventario INTEGER,
    id_producto INTEGER,
    stock_sistema INTEGER,
    stock_contado INTEGER,
    diferencia INTEGER,
    FOREIGN KEY(id_inventario) REFERENCES inventario(id_inventario)
)
`);
// ================= PRODUCTOS =================
app.get('/productos', (req, res) => {
    db.all(`
        SELECT 
            p.id_producto,
            p.nombre,
            p.codigo_barras,
            p.precio_compra,
            p.precio_venta,
            p.stock,
            p.id_proveedor,
            r.rubro_nombre
        FROM productos p
        LEFT JOIN rubro r ON p.id_rubro = r.id_rubro
        WHERE p.activo = 1
    `, [], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});

// ================= FACTURAS =================
app.post('/nueva-factura', (req, res) => {
    const { cod_cliente, metodopago, montototal, items } = req.body;
    const fecha = new Date().toISOString();

    db.serialize(() => {
        const stmtFactura = db.prepare(`
            INSERT INTO factura (fechaFactura, cod_cliente, metodopago, montototal, pagado, estado)
            VALUES (?, ?, ?, ?, 1, 'ACTIVA')
        `);

        stmtFactura.run([fecha, cod_cliente, metodopago, montototal], function(err) {
            if (err) return res.status(500).json({ error: err.message });

            const idFactura = this.lastID;

            const stmtDetalle = db.prepare(`
                INSERT INTO detalle (fkfactura, fkproducto, cantidad, precioventa)
                VALUES (?, ?, ?, ?)
            `);

            items.forEach(item => {
                stmtDetalle.run([idFactura, item.id_producto, item.cantidad, item.precio]);
            });

            stmtDetalle.finalize();
            res.json({ success: true, idFactura });
        });

        stmtFactura.finalize();
    });
});

app.get('/proveedores', (req, res) => {
    db.all("SELECT id_proveedor, nombre FROM proveedor", [], (err, rows) => {
        if (err) {
            console.error("ERROR PROVEEDORES:", err.message);
            return res.status(500).json({ error: err.message });
        }

        console.log("PROVEEDORES:", rows); //  DEBUG
        res.json(rows);
    });
});
//==============rubro===============
app.get('/rubros', (req, res) => {
    db.all("SELECT id_rubro, rubro_nombre FROM rubro", [], (err, rows) => {
        if (err) {
            console.error("ERROR RUBROS:", err.message);
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});
app.get('/productos-por-rubro', (req, res) => {

    const rubro = req.query.rubro; // ej: "Aceite"

    db.all(`
        SELECT nombre, stock
        FROM productos
        WHERE activo = 1
        AND LOWER(nombre) LIKE LOWER(?)
    `, [`%${rubro}%`], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});
//============stock pedido===========
app.get('/stocks-unicos', (req, res) => {
    db.all(`
        SELECT DISTINCT stock
        FROM productos
        WHERE activo = 1
        ORDER BY stock ASC
    `, [], (err, rows) => {

        if(err){
            console.error(err);
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});
//================inventario=============
app.post("/guardar-inventario", (req, res) => {

    console.log("📥 INVENTARIO RECIBIDO:", req.body);

    const { items, usuario } = req.body;

    if(!items || items.length === 0){
        console.log("❌ SIN ITEMS");
        return res.json({ ok:false });
    }

    const fecha = new Date().toISOString();

    db.run(
        "INSERT INTO inventario (usuario, fecha) VALUES (?, ?)",
        [usuario, fecha],
        function(err){

            if(err){
                console.log("❌ ERROR INVENTARIO:", err.message);
                return res.json({ ok:false });
            }

            console.log("✅ INVENTARIO ID:", this.lastID);

            const idInventario = this.lastID;

            const stmt = db.prepare(`
                INSERT INTO inventario_detalle 
                (id_inventario, id_producto, stock_sistema, stock_contado, diferencia)
                VALUES (?, ?, ?, ?, ?)
            `);

            items.forEach(i => {

                console.log("➡️ INSERTANDO:", i);

                stmt.run([
                    idInventario,
                    i.id_producto,
                    i.stock_sistema,
                    i.stock_contado,
                    i.diferencia
                ], (err) => {
                    if(err){
                        console.log("❌ ERROR DETALLE:", err.message);
                    } else {
                        console.log("✅ DETALLE OK");
                    }
                });
            });

            stmt.finalize(() => {
                console.log("✅ FINALIZADO TODO");
                res.json({ ok:true });
            });

        }
    );
});

app.get("/ver-inventarios", (req, res) => {

    const { empleado, desde, hasta } = req.query;

    let sql = `
        SELECT 
            i.id_inventario,
            i.usuario,
            i.fecha,
            COUNT(d.id_detalle) as total_items
        FROM inventario i
        LEFT JOIN inventario_detalle d 
            ON i.id_inventario = d.id_inventario
        WHERE 1=1
    `;

    let params = [];

    //  filtro por empleado
    if(empleado){
        sql += " AND LOWER(i.usuario) LIKE LOWER(?)";
        params.push(`%${empleado}%`);
    }

    //  filtro por fechas
    if(desde && hasta){
        sql += " AND date(i.fecha) BETWEEN date(?) AND date(?)";
        params.push(desde, hasta);
    }

    sql += " GROUP BY i.id_inventario ORDER BY i.fecha DESC";

    console.log("SQL INVENTARIO:", sql);
    console.log("PARAMS:", params);

    db.all(sql, params, (err, rows) => {

        if(err){
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});
app.get("/inventario-detalle/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT 
            d.*,
            p.nombre
        FROM inventario_detalle d
        LEFT JOIN productos p 
            ON d.id_producto = p.id_producto
        WHERE d.id_inventario = ?
    `;

    db.all(sql, [id], (err, rows) => {

        if(err){
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});

//===================estadistica===============
app.get("/estadisticas", (req, res) => {

    const { filtro } = req.query;

    let condicion = "1=1";

    if(filtro === "dia"){
        condicion = "date(f.fechaFactura) = date('now')";
    }
    if(filtro === "semana"){
        condicion = "strftime('%W', f.fechaFactura) = strftime('%W','now')";
    }
    if(filtro === "mes"){
        condicion = "strftime('%m', f.fechaFactura) = strftime('%m','now')";
    }
    if(filtro === "anio"){
        condicion = "strftime('%Y', f.fechaFactura) = strftime('%Y','now')";
    }

    const sql = `
   SELECT 
    SUM(d.cantidad * d.precioventa) as ventas,
    SUM(d.cantidad * (d.precioventa - IFNULL(p.precio_compra, 0))) as ganancia
FROM detalle d
LEFT JOIN factura f ON f.codigo = d.fkfactura
LEFT JOIN productos p ON p.id_producto = d.fkproducto
WHERE ${condicion}
    `;

    console.log("SQL:", sql);

    db.get(sql, [], (err, row) => {
        if(err){
            console.error(err);
            return res.status(500).json(err);
        }

        console.log("RESULTADO:", row);

        res.json(row || { ventas: 0, ganancia: 0 });
    });
});

app.get("/top-productos", (req, res) => {

    const sql = `
    SELECT p.nombre, SUM(d.cantidad) as total
    FROM detalle d
    INNER JOIN productos p ON p.id_producto = d.fkproducto
    GROUP BY p.nombre
    ORDER BY total DESC
    LIMIT 5
    `;

    db.all(sql, [], (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(rows);
    });
});
app.get("/estadisticas-rango", (req, res) => {

    const { desde, hasta } = req.query;

    const sql = `
  SELECT 
    date(f.fechaFactura) as fecha,
    SUM(d.cantidad * d.precioventa) as ventas,
    SUM(d.cantidad * (d.precioventa - IFNULL(p.precio_compra,0))) as ganancia
FROM detalle d
INNER JOIN factura f ON f.codigo = d.fkfactura
LEFT JOIN productos p ON p.id_producto = d.fkproducto
WHERE date(f.fechaFactura) BETWEEN date(?) AND date(?)
GROUP BY date(f.fechaFactura)
ORDER BY fecha ASC
    `;

    db.all(sql, [desde, hasta], (err, rows) => {
        if(err){
            console.error(err);
            return res.status(500).json(err);
        }

        res.json(rows);
    });
});
app.get("/heatmap", (req, res) => {

    const sql = `
    SELECT 
        strftime('%w', f.fechaFactura) as dia,  -- 0=domingo
        SUM(d.cantidad * d.precioventa) as total
    FROM detalle d
    INNER JOIN factura f ON f.codigo = d.fkfactura
    GROUP BY dia
    ORDER BY dia
    `;

    db.all(sql, [], (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(rows);
    });
});

//=================buscar-ventas=======
app.get("/buscar-ventas", (req, res) => {

    let { codigo, cliente, desde, hasta, metodo, estado } = req.query;

    let sql = `
        SELECT * FROM factura
        WHERE 1=1
    `;

    let params = [];

    //  codigo factura
    if (codigo) {
        sql += " AND codigo = ?";
        params.push(codigo);
    }

    //  cliente 
    if (cliente) {
        sql += " AND cod_cliente = ?";
        params.push(cliente);
    }

    //  fechas (solo si ambas existen)
    if (desde && hasta) {
        sql += " AND date(fechaFactura) BETWEEN date(?) AND date(?)";
        params.push(desde, hasta);
    }

    //  método
    if (metodo) {
        sql += " AND metodopago = ?";
        params.push(metodo);
    }

    //  estado
    if (estado) {
        sql += " AND estado = ?";
        params.push(estado);
    }

    console.log("🔎 SQL:", sql);
    console.log("📦 PARAMS:", params);

    db.all(sql, params, (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});

// ================= CREAR USUARIO =================
app.post('/crear-usuario', (req, res) => {

    const { nombre, email, password, telefono, rol } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ ok:false, error: "Faltan datos" });
    }

    db.run(`
        INSERT INTO usuario (nombre, email, password, telefono, rol)
        VALUES (?, ?, ?, ?, ?)
    `,
    [nombre, email, password, telefono, rol],
    function(err){

        if(err){
            console.error("❌ ERROR INSERT USUARIO:", err.message);
            return res.status(500).json({ ok:false, error: err.message });
        }

        console.log("✅ Usuario creado ID:", this.lastID);

        res.json({
            ok:true,
            id:this.lastID
        });
    });

});
// ================= LISTAR USUARIOS =================
app.get('/usuarios', (req, res) => {

   db.all("SELECT id, nombre, email, telefono, rol, estado FROM usuario", [], (err, rows) => {

        if(err){
            console.error("❌ ERROR USUARIOS:", err.message);
            return res.status(500).json({error: err.message});
        }

        console.log("👥 USUARIOS:", rows);

        res.json(rows);
    });

});
// ================= ELIMINAR USUARIO =================
app.post("/eliminar-usuario", (req, res) => {
    const { id } = req.body;

    db.run(
        "UPDATE usuario SET estado = 'inactivo' WHERE id = ?",
        [id],
        function(err){
            if(err) return res.json({ ok:false });
            res.json({ ok:true });
        }
    );
});


// ================= EDITAR USUARIO =================
app.post('/editar-usuario', (req, res) => {

    const { id, nombre, email, password, telefono, rol } = req.body;

    if (!id) {
        return res.json({ ok:false, error: "Falta ID" });
    }

    db.run(`
        UPDATE usuario 
        SET nombre = ?, email = ?, password = ?, telefono = ?, rol = ?
        WHERE id = ?
    `,
    [nombre, email, password, telefono, rol, id],
    function(err){

        if(err){
            console.error("❌ ERROR EDIT:", err.message);
            return res.json({ ok:false, error: err.message });
        }

        res.json({ ok:true });
    });

});
// ================= LOGIN =================
app.post('/login', (req, res) => {

    const { usuario, password } = req.body;

    db.get(`
        SELECT * FROM usuario 
        WHERE (email = ? OR nombre = ?) 
        AND password = ?
    `,
    [usuario, usuario, password],
    (err, row) => {

        if (err) {
            return res.status(500).json({ ok:false });
        }

        if (!row) {
            return res.json({ ok:false, message: "Credenciales incorrectas" });
        }

        //  BLOQUEO
        if(row.estado === "inactivo"){
            return res.json({ ok:false, message: "Usuario desactivado" });
        }

        res.json({
            ok:true,
            usuario: {
                id: row.id,
                nombre: row.nombre,
                rol: row.rol
            }
        });

    });
});
app.post("/activar-usuario", (req, res) => {
    const { id } = req.body;

    db.run(
        "UPDATE usuario SET estado = 'activo' WHERE id = ?",
        [id],
        function(err){
            if(err) return res.json({ ok:false });
            res.json({ ok:true });
        }
    );
});
// ================= VER FACTURA =================
app.get("/factura/:id", (req, res) => {

    const id = req.params.id;

    const sqlFactura = `
        SELECT * FROM factura WHERE codigo = ?
    `;

    const sqlItems = `
        SELECT 
            d.cantidad,
            d.precioventa,
            p.nombre
        FROM detalle d
        INNER JOIN productos p ON p.id_producto = d.fkproducto
        WHERE d.fkfactura = ?
    `;

    db.get(sqlFactura, [id], (err, factura) => {

        if (err) return res.status(500).json({ error: err.message });

        if (!factura) return res.status(404).json({ error: "No existe factura" });

        db.all(sqlItems, [id], (err, items) => {

            if (err) return res.status(500).json({ error: err.message });

            res.json({
                factura,
                items
            });
        });
    });
});
// ================= BUSCAR =================
app.get('/buscar-productos', (req, res) => {

    const q = req.query.q;

    db.all(`
        SELECT id_producto, nombre, precio_venta, stock, codigo_barras 
        FROM productos 
        WHERE nombre LIKE ? OR codigo_barras LIKE ? 
        LIMIT 6
    `, [`%${q}%`, `%${q}%`], (err, rows) => {

        if (err) return res.status(500).json({ error: err.message });

        res.json(rows);
    });
});
app.get('/buscar-stock', (req, res) => {

    let { q, categoria, proveedor, min, max, stock } = req.query;

    let sql = `
        SELECT * FROM productos
        WHERE activo = 1
    `;

    let params = [];

    if(q){
        sql += ` AND (nombre LIKE ? OR codigo_barras LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`);
    }

    if(categoria){
        sql += ` AND id_categoria = ?`;
        params.push(categoria);
    }

    if(proveedor){
        sql += ` AND id_proveedor = ?`;
        params.push(proveedor);
    }

    if(min){
        sql += ` AND precio_venta >= ?`;
        params.push(min);
    }

    if(max){
        sql += ` AND precio_venta <= ?`;
        params.push(max);
    }

    if(stock === "bajo"){
        sql += ` AND stock <= 5`;
    }

    if(stock === "alto"){
        sql += ` AND stock > 5`;
    }

    db.all(sql, params, (err, rows) => {
        if(err) return res.status(500).json(err);
        res.json(rows);
    });
});
app.post("/editar-producto", (req, res) => {

    const {
        id_producto,
        nombre,
        codigo_barras,
        precio_compra,
        precio_venta,
        stock
    } = req.body;

    console.log("📥 EDITAR PRODUCTO:", req.body);

    //  VALIDACIÓN CLAVE
    if (!id_producto) {
        console.error("❌ ID_PRODUCTO VACÍO");
        return res.status(400).json({ ok:false, error:"ID faltante" });
    }

    db.run(`
        UPDATE productos 
        SET nombre = ?, 
            codigo_barras = ?, 
            precio_compra = ?, 
            precio_venta = ?, 
            stock = ?
        WHERE id_producto = ?
    `, [
        nombre || "",
        codigo_barras || "",
        precio_compra || 0,
        precio_venta || 0,
        stock || 0,
        id_producto
    ], function(err){

        if(err){
            console.error("❌ ERROR SQL EDITAR:", err.message);
            return res.status(500).json({ok:false, error: err.message});
        }

        console.log("✅ FILAS AFECTADAS:", this.changes);

        res.json({ok:true});
    });
});
// ================= CLIENTES =================
app.get('/buscar-cliente', (req, res) => {

    let q = (req.query.q || "").toString();

    const limpio = q.replace(/\D/g, ""); // solo números

    db.all(`
        SELECT nombre, cuit, telefono
        FROM cliente
        WHERE 
            LOWER(nombre) LIKE LOWER(?)
            OR CAST(cuit AS TEXT) LIKE ?
        LIMIT 10
    `, [`%${q}%`, `%${limpio}%`], (err, rows) => {

        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        console.log("RESULTADO BUSQUEDA:", rows);

        res.json(rows);
    });
});
// ================= FACTURAR =================
app.post('/facturar', (req, res) => {

  const { cliente, items, total, usuario } = req.body;
    const fecha = new Date().toISOString();

    console.log("📥 DATA:", req.body);

    db.serialize(() => {

        // ================= CLIENTE =================
        db.get(
            "SELECT codigocliente FROM cliente WHERE cuit = ?",
            [cliente.cuit],
            (err, row) => {

                if (err) {
                    console.error("❌ ERROR CLIENTE:", err.message);
                    return res.status(500).json({ error: err.message });
                }

                if (!row) {

                    db.run(
                        "INSERT INTO cliente (nombre, cuit) VALUES (?, ?)",
                        [cliente.nombre, cliente.cuit],
                        function(err) {

                            if (err) {
                                console.error("❌ ERROR INSERT CLIENTE:", err.message);
                                return res.status(500).json({ error: err.message });
                            }

                            obtenerCliente(cliente.cuit);
                        }
                    );

                } else {
crearFactura(row.codigocliente, usuario);               }
            }
        );

        // volver a buscar cliente
        function obtenerCliente(cuit){
            db.get(
                "SELECT codigocliente FROM cliente WHERE cuit = ?",
                [cuit],
                (err, row) => {

                    if (err || !row) {
                        console.error("❌ ERROR REBUSCAR CLIENTE:", err?.message);
                        return res.status(500).json({ error: err?.message });
                    }

                    crearFactura(row.codigocliente, usuario);
                }
            );
        }

        // ================= FACTURA =================
function crearFactura(codCliente, usuario){
            db.run(`
   INSERT INTO factura 
(fechaFactura, cod_cliente, metodopago, montototal, pagado, estado, atendido_por)
VALUES (?, ?, 'Contado', ?, 1, 'ACTIVA', ?)
            `,
        [fecha, codCliente, total, usuario || "Sistema"],
            function(err){

                if (err) {
                    console.error("❌ ERROR FACTURA:", err.message);
                    return res.status(500).json({ error: err.message });
                }

                //  IMPORTANTE: usar codigo real
                db.get("SELECT last_insert_rowid() as id", [], (err, row) => {

                    if (err) {
                        console.error("❌ ERROR ID FACTURA:", err.message);
                        return res.status(500).json({ error: err.message });
                    }

                    const idFactura = row.id;

                 const stmt = db.prepare(`
    INSERT INTO detalle 
    (fkfactura, fkproducto, cantidad, precioventa, preciocompra)
    VALUES (?, ?, ?, ?, ?)
`);

                    items.forEach(item => {

                        if (!item.id_producto) {
                            console.warn("⚠️ Producto sin ID:", item);
                            return;
                        }

                   stmt.run([
    idFactura,
    item.id_producto,
    item.cantidad,
    item.precio,
    item.precio_compra || 0
]);

                        // DESCONTAR STOCK
                        db.run(`
                            UPDATE productos 
                            SET stock = stock - ?
                            WHERE id_producto = ?
                        `, [item.cantidad, item.id_producto]);

                    });

                    stmt.finalize();

                    res.json({
                        ok: true,
                        idFactura,
                        fecha
                    });

                });

            });
        }

    });

});
app.get('/favicon.ico', (req, res) => res.status(204));
app.listen(3000, () => {
    console.log("🚀 Servidor en http://localhost:3000");
});
