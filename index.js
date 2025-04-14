import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';  
import path from 'path';  // ✅ Solo una vez, en formato ES Modules
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs'; 

const app = express();
app.set('trust proxy', true); // ⬅️ Habilita detección de IP real detrás de proxy

app.use(express.static('public'));
app.use(express.json());
app.use(cors());

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Configurar multer para la carga de imágenes
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Solución para usar `__dirname` en módulos ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseRouter = express.Router();

let db = null; // Conexión global
let lastUsedTime = Date.now();

const PORT = process.env.PORT || 3028;

// Abrir la conexión global si no está abierta
function ensureDatabaseConnection() {
  if (!db) {
    db = new sqlite3.Database('./restaurant.db', (err) => {
      if (err) {
        console.error('Error al conectar con la base de datos SQLite:', err.message);
        return null; // Asegúrate de que maneje errores correctamente
      } else {
        console.log('Conexión a SQLite abierta.');
      }
    });
  }
  lastUsedTime = Date.now(); // Actualiza el tiempo de uso
  return db; // Siempre devuelve el objeto db
}

// Cerrar la conexión si no se usa después de un tiempo
function closeDatabaseIfIdle() {
  const IDLE_TIMEOUT = 60000; // Tiempo de inactividad (1 minuto)
  if (db && Date.now() - lastUsedTime > IDLE_TIMEOUT) {
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos SQLite:', err.message);
      } else {
        console.log('Conexión a la base de datos SQLite cerrada por inactividad.');
      }
    });
    db = null; // Limpia la referencia
  }
}

// Verifica periódicamente si la conexión está inactiva
setInterval(closeDatabaseIfIdle, 30000); // Cada 30 segundos

// Manejo del cierre del servidor
process.on('SIGINT', () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos SQLite al detener el servidor:', err.message);
      } else {
        console.log('Conexión a la base de datos SQLite cerrada.');
      }
      process.exit(0);
    });
  } else {
    console.log('No hay conexión abierta a SQLite.');
    process.exit(0);
  }
});

// Asegúrate de abrir la conexión antes de ejecutar cualquier consulta
ensureDatabaseConnection();


import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

let menuVersion = 2; // O usa un timestamp inicial

const JWT_SECRET = process.env.JWT_SECRET || "clave-unica-de-esta-app-casa-vera"; 

// Hardcoded user for demonstration purposes
const hardcodedUser = {
  username: "admin",
  password: bcrypt.hashSync("casa-vera_app", 8)  // Hashed password
};

// Endpoint de login
baseRouter.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === hardcodedUser.username && bcrypt.compareSync(password, hardcodedUser.password)) {
    
    // Generar el token con identificación de la app y tiempo de expiración
    const token = jwt.sign(
      { id: hardcodedUser.username, app: "casa-vera" },
      JWT_SECRET,
    );

    res.status(200).send({ auth: true, token });
  } else {
    res.status(401).send({ auth: false, message: "Invalid credentials" });
  }
});

// CRUD Endpoints


baseRouter.post('/api/menu', upload.single('imagen'), async (req, res) => {
  const db = ensureDatabaseConnection();
  const { nombre, precio, descripcion, tipo, newSectionName, stock, parent_group } = req.body;

  let parsedStock = [];
  try {
    parsedStock = typeof stock === 'string' ? JSON.parse(stock) : stock;
    if (!Array.isArray(parsedStock)) throw new Error("Stock debe ser un array.");
  } catch (err) {
    return res.status(400).json({ error: "Formato inválido en el stock." });
  }

  const subelement = req.body.subelement === 'true';

  let img_url = '';
  if (req.file) {
    const imageFileName = `compressed-${Date.now()}.webp`;
    const compressedImagePath = path.join(__dirname, 'public/img/', imageFileName);

    try {
      await sharp(req.file.buffer)
        .resize({ width: 1200, height: 1200, fit: "inside" })
        .toFormat("webp", { quality: 85 })
        .toFile(compressedImagePath);

      img_url = `img/${imageFileName}`;
    } catch (error) {
      return res.status(500).json({ error: 'Error al procesar la imagen.' });
    }
  }

  // ✅ Manejo de nuevas secciones en el menú
  if (tipo === 'new-section' && newSectionName) {
    const upperNewSectionName = newSectionName.trim().toUpperCase();
    db.get('SELECT id FROM menu_sections WHERE UPPER(TRIM(nombre)) = ? AND parent_group = ?', 
           [upperNewSectionName, parent_group], 
           (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (row) {
        // 🚨 La sección ya existe en este grupo
        return res.status(400).json({ error: `La sección "${newSectionName}" ya existe en "${parent_group}".` });
      } 

      // 📌 Obtener la próxima posición dentro del `parent_group`
      db.get('SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition FROM menu_sections WHERE parent_group = ?', 
             [parent_group], 
             (err, row) => {
          if (err) {
              return res.status(500).json({ error: err.message });
          }

          // 📌 Insertar la nueva sección
          db.run('INSERT INTO menu_sections (nombre, position, parent_group) VALUES (?, ?, ?)', 
                 [upperNewSectionName, row.nextPosition, parent_group], 
                 function (err) {
              if (err) {
                  return res.status(500).json({ error: err.message });
              }
              const newSectionId = this.lastID;
              insertMenuItem(nombre, precio, descripcion, upperNewSectionName, img_url, subelement, parsedStock, parent_group, res);
          });
      });
    });
  } else {
    insertMenuItem(nombre, precio, descripcion, tipo.toUpperCase(), img_url, subelement, parsedStock, parent_group, res);
  }
});



function insertMenuItem(nombre, precio, descripcion, tipo, img_url, subelement, stock, parent_group, res) {
  const db = ensureDatabaseConnection();
  const precioEntero = parseInt(precio.toString().replace(/\./g, ''));

  db.run(
    'INSERT INTO menu_items (nombre, precio, descripcion, tipo, img_url, subelement, parent_group) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [nombre, precioEntero, descripcion, tipo.toUpperCase(), img_url, subelement, parent_group || 'secion'],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const itemId = this.lastID;

      // Insertar stock en `stock_items`
      const insertStockQuery = 'INSERT INTO stock_items (menu_item_id, talle, color, cantidad) VALUES (?, ?, ?, ?)';
      const stockPromises = stock.map(({ talle, color, cantidad }) => {
        return new Promise((resolve, reject) => {
          db.run(insertStockQuery, [itemId, talle, color, cantidad], function (err) {
            if (err) return reject(err);
            resolve();
          });
        });
      });

      Promise.all(stockPromises)
        .then(() => res.json({ id: itemId, stock }))
        .catch(err => res.status(500).json({ error: 'Error al insertar stock: ' + err.message }));
    }
  );
}

 
  
baseRouter.get('/api/menu', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const query = `
  SELECT mi.*, ms.id as section_id
  FROM menu_items mi
  LEFT JOIN menu_sections ms 
    ON mi.tipo = ms.nombre 
    AND mi.parent_group = ms.parent_group
  ORDER BY ms.position, mi.position
`;
  db.all(query, [], (err, rows) => {
      if (err) {
          res.status(500).json({ error: err.message });
          return;
      }
      res.json({ data: rows });
  });
});


  
baseRouter.put('/api/menu/:id', upload.single('imagen'), async (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;
  const { nombre, precio, descripcion, tipo, stock, parent_group } = req.body;

  if (!nombre || !precio || !descripcion || !tipo || !stock) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  let parsedStock = [];
  try {
    parsedStock = typeof stock === "string" ? JSON.parse(stock) : stock;
    if (!Array.isArray(parsedStock)) throw new Error("Stock debe ser un array.");
  } catch (err) {
    return res.status(400).json({ error: "Formato inválido en el stock." });
  }

  const precioEntero = parseInt(precio.toString().replace(/\./g, ""));

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.get("SELECT img_url FROM menu_items WHERE id = ?", [id], async (err, row) => {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: err.message });
      }

      const oldImgUrl = row ? row.img_url : null;
      let newImgUrl = oldImgUrl;

      if (req.file) {
        const imageFileName = `compressed-${Date.now()}.webp`;
        const compressedImagePath = path.join(__dirname, 'public/img/', imageFileName);

        try {
          await sharp(req.file.buffer)
            .resize({ width: 1200, height: 1200, fit: "inside" })
            .toFormat("webp", { quality: 85 })
            .toFile(compressedImagePath);

          newImgUrl = `img/${imageFileName}`;
        } catch (error) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: "Error al procesar la imagen." });
        }
      }

      const query = `
        UPDATE menu_items 
        SET nombre = ?, precio = ?, descripcion = ?, tipo = ?, img_url = ?, parent_group = ?
        WHERE id = ?`;
      db.run(
        query,
        [nombre, precioEntero, descripcion, tipo, newImgUrl, parent_group || "seccion", id],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            db.run("ROLLBACK");
            return res.status(404).json({ error: "Producto no encontrado." });
          }

          // Obtener el stock actual antes de modificarlo
          db.all("SELECT talle, color FROM stock_items WHERE menu_item_id = ?", [id], (err, existingStock) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err.message });
            }

            const stockSet = new Set(existingStock.map(({ talle, color }) => `${talle}-${color}`));

            const updateStockPromises = parsedStock.map(({ talle, color, cantidad }) => {
              const stockKey = `${talle}-${color}`;

              if (stockSet.has(stockKey)) {
                // ✅ Si la combinación ya existe, actualizar la cantidad
                return new Promise((resolve, reject) => {
                  db.run("UPDATE stock_items SET cantidad = ? WHERE menu_item_id = ? AND talle = ? AND color = ?", 
                    [cantidad, id, talle, color], function (err) {
                      if (err) return reject(err);
                      resolve();
                    });
                });
              } else {
                // ✅ Si la combinación no existe, insertarla
                return new Promise((resolve, reject) => {
                  db.run("INSERT INTO stock_items (menu_item_id, talle, color, cantidad) VALUES (?, ?, ?, ?)", 
                    [id, talle, color, cantidad], function (err) {
                      if (err) return reject(err);
                      resolve();
                    });
                });
              }
            });

            // ✅ Si algún stock tiene cantidad 0, eliminarlo
            parsedStock.forEach(({ talle, color, cantidad }) => {
              if (cantidad === 0) {
                db.run("DELETE FROM stock_items WHERE menu_item_id = ? AND talle = ? AND color = ?", 
                  [id, talle, color]);
              }
            });

            Promise.all(updateStockPromises)
              .then(() => {
                db.run("COMMIT", (err) => {
                  if (err) {
                    return res.status(500).json({ error: err.message });
                  }

                  // ✅ Si hay una nueva imagen, eliminar la anterior (excepto si son iguales)
                  if (req.file && oldImgUrl && newImgUrl !== oldImgUrl) {
                    const fullPath = path.join(__dirname, "public", oldImgUrl);
                    fs.unlink(fullPath, (err) => {
                      if (err) console.error("Error al eliminar la imagen antigua:", err);
                    });
                  }

                  res.json({ success: true, img_url: newImgUrl });
                });
              })
              .catch((err) => {
                db.run("ROLLBACK");
                res.status(500).json({ error: err.message });
              });
          });
        }
      );
    });
  });
});


  


baseRouter.delete('/api/menu/:id', (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;

  db.get('SELECT img_url FROM menu_items WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    db.run('DELETE FROM stock_items WHERE menu_item_id = ?', [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run('DELETE FROM menu_items WHERE id = ?', [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Producto no encontrado." });
        }

        // ✅ Verificar si hay imagen asociada antes de intentar eliminarla
        if (row.img_url) {
          const imagePath = path.join(__dirname, 'public', 'img', path.basename(row.img_url)); // 🔥 Asegura la ruta correcta

          fs.access(imagePath, fs.constants.F_OK, (err) => {
            if (!err) {
              fs.unlink(imagePath, (err) => {
                if (err) {
                  console.error("❌ Error al eliminar la imagen:", err);
                  return res.status(500).json({ error: "Producto eliminado, pero la imagen no pudo ser eliminada." });
                }
                console.log(`✅ Imagen eliminada correctamente: ${imagePath}`);
                res.json({ deleted: true }); // 🔥 Solo respondemos después de eliminar la imagen correctamente
              });
            } else {
              console.warn("⚠️ La imagen no existe en la carpeta:", imagePath);
              res.json({ deleted: true }); // 🔥 Si no existe, igual confirmamos que el producto fue eliminado
            }
          });

        } else {
          res.json({ deleted: true }); // ✅ Si no hay imagen, simplemente confirmamos la eliminación
        }
      });
    });
  });
});

 
  baseRouter.post('/api/announcements', upload.single('image'), async (req, res) => {
    const db = ensureDatabaseConnection();
    const { text, paragraph, state } = req.body;
    const BASE_URL = 'https://octopus-app.com.ar/casa-vera';

    let newImageUrl = '';
    if (req.file) {
        const imageFileName = `compressed-${Date.now()}.webp`;
        const compressedImagePath = path.join(__dirname, 'public/img/', imageFileName);

        try {
            // 📌 Procesar imagen con Sharp (sin cambiar el alto)
            await sharp(req.file.buffer)
                .resize({ width: 800 })  // 🔹 Solo ajustamos el ancho, el alto se mantiene proporcional
                .toFormat('webp', { quality: 70 })  // 🔹 Convertimos a WEBP con calidad 70%
                .toFile(compressedImagePath);

            newImageUrl = `${BASE_URL}/img/${imageFileName}`;
        } catch (error) {
            console.error('Error al procesar la imagen con Sharp:', error);
            return res.status(500).json({ error: 'Error al procesar la imagen.' });
        }
    }

    const checkAnnouncementExists = 'SELECT id, image_url FROM announcements WHERE id = 1';

    db.get(checkAnnouncementExists, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Error al verificar el anuncio existente.' });
        }

        let query, params;
        const currentImageUrl = newImageUrl || (row ? row.image_url : '');

        if (row) {
            // 📌 Actualizar anuncio existente
            query = 'UPDATE announcements SET image_url = ?, text = ?, paragraph = ?, state = ? WHERE id = 1';
            params = [currentImageUrl, text, paragraph, state];
        } else {
            // 📌 Crear un nuevo anuncio
            query = 'INSERT INTO announcements (image_url, text, paragraph, state) VALUES (?, ?, ?, ?)';
            params = [currentImageUrl, text, paragraph, state];
        }

        db.run(query, params, function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error al guardar el anuncio.' });
            }

            res.json({
                success: true,
                id: this.lastID,
                image_url: currentImageUrl
            });
        });
    });
});

// Ruta GET para obtener el anuncio activo
baseRouter.get('/api/announcements', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const getActiveAnnouncement = 'SELECT * FROM announcements WHERE state = \'true\' ORDER BY id DESC LIMIT 1';

  db.get(getActiveAnnouncement, [], (err, row) => {

    if (err) {
      console.error("Error al intentar obtener el anuncio activo de la base de datos:", err.message);

      res.status(500).json({ error: err.message });
      return;
    }

    res.json(row ? { success: true, announcement: row } : { success: false, message: 'No active announcement found' });
  });
});

baseRouter.put('/api/sections/order', (req, res) => {
  const db = ensureDatabaseConnection();
  let sections = req.body.sections;

  if (!sections || !Array.isArray(sections)) {
      console.error("❌ Error: 'sections' no es un array válido.");
      return res.status(400).json({ error: "Formato inválido. Se esperaba un array en 'sections'." });
  }

  console.log("🔄 Secciones recibidas para ordenar:", sections);

  db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 🔹 Asegurar que todas las secciones tengan una posición válida antes de actualizar
      db.run('UPDATE menu_sections SET position = (SELECT COALESCE(MAX(position), 0) + 1 FROM menu_sections) WHERE position IS NULL');

      const stmt = db.prepare('UPDATE menu_sections SET position = ? WHERE id = ?');

      // 🔹 Asignar nuevas posiciones únicas en base al array recibido
      sections.forEach((section, index) => {
          stmt.run([index + 1, section.id], function(err) {
              if (err) {
                  console.error(`❌ Error al actualizar sección ID ${section.id}:`, err);
              } else {
                  console.log(`✅ Sección actualizada correctamente - ID: ${section.id}, Nueva posición: ${index + 1}`);
              }
          });
      });

      stmt.finalize();
      db.run('COMMIT', err => {
          if (err) {
              console.error("❌ Error al ejecutar la transacción:", err);
              return res.status(500).json({ error: err.message });
          }
          console.log("✅ Transacción completada, secciones ordenadas correctamente.");
          res.json({ success: true });
      });
  });
});


baseRouter.put('/api/menu/order', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const items = req.body.items; // Array de objetos con {id, position}

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare('UPDATE menu_items SET position = ? WHERE id = ?');
    items.forEach(item => {
      stmt.run(item.position, item.id);
    });
    stmt.finalize();
    db.run('COMMIT', err => {
      if (err) {
        console.error("Error al ejecutar la transacción:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});





baseRouter.get('/api/sections', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const query = 'SELECT id, nombre, position, parent_group FROM menu_sections ORDER BY position'; // 🔹 Asegurar orden correcto
  db.all(query, [], (err, rows) => {
      if (err) {
          res.status(500).json({ error: err.message });
          return;
      }
      console.log("🔄 Secciones enviadas al frontend:", rows); // Debugging
      res.json({ data: rows });
  });
});


baseRouter.get('/api/menu/:id', (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;

  db.get('SELECT * FROM menu_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      console.error("Error al obtener el ítem:", err);
      return res.status(500).json({ error: "Error en el servidor." });
    }

    if (!item) {
      return res.status(404).json({ error: "Ítem no encontrado." });
    }

    // Obtener talles y colores desde `stock_items`
    db.all(
      `SELECT id, talle, color, cantidad 
       FROM stock_items 
       WHERE menu_item_id = ? AND cantidad > 0`,
      [id],
      (err, stock) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
    
        // Organizar stock en estructura adecuada
        const talles = {};
        stock.forEach(({ id, talle, color, cantidad }) => {
          if (!talles[talle]) {
            talles[talle] = [];
          }
          talles[talle].push({
            id, // ✅ Ahora incluimos el ID correctamente
            color,
            cantidad
          });
        });
    
        res.json({ ...item, stock: talles });
      }
    );
    
  });
});
baseRouter.get('/api/menu/:id/talles', (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;

  db.all(
    `SELECT talle, color, cantidad 
     FROM stock_items 
     WHERE menu_item_id = ? AND cantidad > 0`,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!rows.length) {
        return res.json({ data: {}, message: "No hay stock disponible para este producto." });
      }

      // Agrupar stock por talle
      const talles = {};
      rows.forEach(({ talle, color, cantidad }) => {
        if (!talles[talle]) {
          talles[talle] = [];
        }
        talles[talle].push({ color, cantidad });
      });

      res.json({ data: talles });
    }
  );
});

// PUT: Actualizar el precio de envío
baseRouter.put('/api/delivery', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const { price } = req.body;

  db.run('UPDATE delivery_settings SET price = ? WHERE id = 1', [price], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      // Si no existe el registro, crearlo
      db.run('INSERT INTO delivery_settings (price) VALUES (?)', [price], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });
});

baseRouter.put("/api/menu/:id/visibility", (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;
  const { hidden } = req.body;

  const query = `UPDATE menu_items SET hidden = ? WHERE id = ?`;
  db.run(query, [hidden, id], function (err) {
    if (err) {
      return res.status(500).json({ error: "Error updating visibility" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json({ success: true });
  });
});


baseRouter.put('/api/delivery', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const { price } = req.body;
  if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Invalid price' });
  }
  db.run('UPDATE delivery_settings SET price = ? WHERE id = 1', [price], function (err) {
      if (err) {
          console.error('Error updating delivery price:', err);
          res.status(500).json({ error: 'Failed to update delivery price' });
      } else if (this.changes === 0) {
          res.status(404).json({ error: 'Delivery price not found' });
      } else {
          res.json({ success: true });
      }
  });
});

baseRouter.get('/api/delivery', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  db.get('SELECT price FROM delivery_settings WHERE id = 1', [], (err, row) => {
      if (err) {
          console.error('Error fetching delivery price:', err);
          res.status(500).json({ error: 'Failed to fetch delivery price' });
      } else if (!row) {
          res.status(404).json({ error: 'Delivery price not found' });
      } else {
          res.json({ price: row.price });
      }
  });
});

// Añadir un talle a un ítem
baseRouter.post('/api/menu/:id/stock', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar conexión
  const menuItemId = req.params.id;
  const { talle, color, cantidad } = req.body;

  if (!talle || !color || cantidad === undefined) {
    return res.status(400).json({ error: "Faltan datos: talle, color o cantidad." });
  }

  db.run(
    `INSERT INTO stock_items (menu_item_id, talle, color, cantidad) VALUES (?, ?, ?, ?)`,
    [menuItemId, talle, color, cantidad],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: "Stock agregado correctamente." });
    }
  );
});

baseRouter.put("/api/stock/:id", (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;
  const { talle, color, cantidad } = req.body;

  if (!talle || !color || cantidad === undefined) {
    return res.status(400).json({ error: "Faltan datos: talle, color o cantidad." });
  }

  db.run(
    "UPDATE stock_items SET talle = ?, color = ?, cantidad = ? WHERE id = ?",
    [talle, color, cantidad, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Si la cantidad llega a 0, eliminar la entrada de stock
      if (cantidad === 0) {
        db.run("DELETE FROM stock_items WHERE id = ?", [id]);
      }

      res.json({ success: true, changes: this.changes });
    }
  );
});


baseRouter.delete('/api/stock/:id', (req, res) => {
  const db = ensureDatabaseConnection();
  const { id } = req.params;

  db.run('DELETE FROM stock_items WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Stock no encontrado." });
    }

    // Verificar si el producto se quedó sin stock
    db.get(
      'SELECT COUNT(*) AS total FROM stock_items WHERE menu_item_id = (SELECT menu_item_id FROM stock_items WHERE id = ?)',
      [id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (row.total === 0) {
          // Ocultar producto si no tiene stock
          db.run(
            'UPDATE menu_items SET hidden = 1 WHERE id = (SELECT menu_item_id FROM stock_items WHERE id = ?)',
            [id]
          );
        }

        res.json({ deleted: this.changes });
      }
    );
  });
});

baseRouter.get('/api/orders', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const query = `
  SELECT 
    order_id as id,
    CASE WHEN COUNT(*) = SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) 
         THEN 'paid' ELSE 'pending' END as status,
    MAX(details) as details,
    MAX(created_at) as created_at
  FROM order_items
  GROUP BY order_id
`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener pedidos:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});


baseRouter.post('/api/orders', (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const { id, items } = req.body;

  // Validación de datos obligatorios
  if (!id || !items?.length) {
    return res.status(400).json({ success: false, error: 'Invalid order data' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Verificar si el pedido ya existe
    db.get('SELECT order_id FROM order_items WHERE order_id = ?', [id], (err, row) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ success: false, error: err.message });
      }
      if (row) {
        db.run('ROLLBACK');
        return res.status(409).json({ success: false, error: 'Order already exists' });
      }

      // Preparar la consulta para insertar los items del pedido
      const stmt = db.prepare(`
        INSERT INTO order_items 
        (order_id, product_id, talle, color, quantity, price_at_time, status, details) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      try {
        items.forEach(item => {
          const talle = item.talle || null; // Permitir valores `NULL`
          const color = item.color || null; // Permitir valores `NULL`
          
          stmt.run([id, item.product_id, talle, color, item.quantity, item.price_at_time, 'pending', item.details]);
        });

        stmt.finalize();
        db.run('COMMIT', err => {
          if (err) {
            console.error('Error en COMMIT:', err);
            return res.status(500).json({ success: false, error: err.message });
          }
          res.json({ success: true, id });
        });
      } catch (error) {
        console.error('Error al insertar items:', error);
        db.run('ROLLBACK');
        res.status(500).json({ success: false, error: error.message });
      }
    });
  });
});

baseRouter.put('/api/orders/:id/status', async (req, res) => {
  const db = ensureDatabaseConnection(); // Garantizar la conexión

  const { id } = req.params;

  try {
    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (err) => (err ? reject(err) : resolve())));

    // Paso 1: Verificar stock disponible en `stock_items`
    const stockCheck = await new Promise((resolve, reject) => {
      db.all(`
        SELECT oi.product_id, oi.talle, oi.color, oi.quantity, si.cantidad
        FROM order_items oi
        LEFT JOIN stock_items si 
          ON oi.product_id = si.menu_item_id 
          AND oi.talle = si.talle 
          AND oi.color = si.color
        WHERE oi.order_id = ? AND oi.status = 'pending'
      `, [id], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    // Paso 2: Restar stock por talle y color
    for (const item of stockCheck) {
      if (item.cantidad < item.quantity) {
        throw new Error(`Stock insuficiente para ${item.talle} - ${item.color}`);
      }

      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE stock_items 
          SET cantidad = cantidad - ?
          WHERE menu_item_id = ? AND talle = ? AND color = ?`,
          [item.quantity, item.product_id, item.talle, item.color],
          (err) => (err ? reject(err) : resolve())
        );
      });
    }

    // Paso 3: Eliminar registros con cantidad = 0
    await new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM stock_items 
        WHERE cantidad = 0`,
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Paso 4: Ocultar talles y productos sin stock
    const stockCheckProducts = await new Promise((resolve, reject) => {
      db.all(`
        SELECT menu_item_id, COUNT(*) AS totalStock 
        FROM stock_items 
        GROUP BY menu_item_id`,
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    for (const product of stockCheckProducts) {
      if (product.totalStock === 0) {
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE menu_items SET hidden = 1 WHERE id = ?`,
            [product.menu_item_id],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
    }

    // Paso 5: Cambiar estado del pedido a "paid"
    await new Promise((resolve, reject) => {
      db.run('UPDATE order_items SET status = ? WHERE order_id = ?', ['paid', id], (err) =>
        err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => db.run('COMMIT', (err) => (err ? reject(err) : resolve())));

    res.json({ success: true });

  } catch (error) {
    await new Promise((resolve, reject) => db.run('ROLLBACK', (err) => (err ? reject(err) : resolve())));
    res.status(500).json({ error: error.message });
  }
});


import os from 'os';

// Endpoint para monitorear el uso de memoria
baseRouter.get('/monitor/memory', (req, res) => {

  const memoryData = process.memoryUsage();
  const totalMemory = os.totalmem();

  // Devolver la información del uso de memoria
  res.json({
    rss: `${(memoryData.rss / 1024 / 1024).toFixed(2)} MB`, // Memoria total asignada al proceso
    heapTotal: `${(memoryData.heapTotal / 1024 / 1024).toFixed(2)} MB`, // Heap total disponible
    heapUsed: `${(memoryData.heapUsed / 1024 / 1024).toFixed(2)} MB`, // Heap realmente usado
    external: `${(memoryData.external / 1024 / 1024).toFixed(2)} MB`, // Memoria usada por módulos nativos
    totalSystemMemory: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`, // Memoria total del sistema
  });
});
// Obtener IP del visitante
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

// Obtener rangos de fecha para mes actual y anterior
function getMonthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d);
  d.setMonth(d.getMonth() + 1);
  const end = new Date(d);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

// POST /visitas
baseRouter.post('/visitas', (req, res) => {
  console.log("📩 Visita recibida");

  const db = ensureDatabaseConnection(); // <== ✅ CORRECTO
  const ip = getClientIp(req);
  const fecha = new Date().toISOString().split('T')[0];
  console.log(`👤 IP: ${ip} - Fecha: ${fecha}`);

  db.get(`SELECT 1 FROM visitas WHERE ip = ? AND fecha = ?`, [ip, fecha], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) {
      db.run(`INSERT INTO visitas (ip, fecha) VALUES (?, ?)`, [ip, fecha]);
    }

    res.json({ ok: true });
  });
});

// GET /visitas
baseRouter.get('/visitas', (req, res) => {
  const db = ensureDatabaseConnection(); // <== ✅ CORRECTO

  const current = getMonthRange(0);
  const prev = getMonthRange(-1);

  const contar = (range, cb) => {
    db.all(
      `SELECT DISTINCT ip FROM visitas WHERE fecha BETWEEN ? AND ?`,
      [range.start, range.end],
      (err, rows) => cb(err, rows.length)
    );
  };

  contar(current, (err1, actual) => {
    if (err1) return res.status(500).json({ error: err1.message });

    contar(prev, (err2, anterior) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({
        mes_actual: actual,
        mes_anterior: anterior
      });
    });
  });
});


app.use('/casa-vera', baseRouter);

// Luego sirve el contenido estático
app.use('/casa-vera', express.static(path.join(__dirname, 'public')));

// Finalmente, para todas las demás rutas bajo '/inventario', sirve el index.html
app.get('/casa-vera/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});


baseRouter.get('/api/menuVersion', (req, res) => {
    res.json({ version: menuVersion });
});
// app.get('/api/menuVersion', (req, res) => {
//   res.json({ version: menuVersion });
// });
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


