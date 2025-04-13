// Oculta las selecciones de talle y color al renderizar productos
document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.innerHTML = `
  .talle-wrapper,
  .talle-select,
  .color-select,
  #stock-section {
    display: none !important;
  }
`;

  document.head.appendChild(style);
});

let menuItemsPromise = null;
let menuSectionsPromise = null;
window.onscroll = function () {
  scrollFunction();
};

function scrollFunction() {
  const topButton = document.getElementById("scrollToTopButton");
  const bottomButton = document.getElementById("scrollToBottomButton");

  if (document.documentElement.scrollTop > 20) {
    topButton.style.display = "block";
  } else {
    topButton.style.display = "none";
  }

  if (window.innerHeight + window.scrollY < document.body.offsetHeight - 20) {
    bottomButton.style.display = "block";
  } else {
    bottomButton.style.display = "none";
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// En ambos archivos (script.js y scriptadmin.js)
function formatDateArgentina(date, includeTime = true) {
  const options = {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false;
  }

  const formatted = new Date(date).toLocaleString('es-AR', options);
  return includeTime ? formatted : formatted.split(',')[0];
}

const PARENT_GROUPS = [
  {
    id: 'seccionunica',
    title: '',
    description: ''
  },

];
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatPrice(value) {
  // Ya sabemos que value es un número entero desde la BD
  return Math.floor(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function checkAuthentication() {
  const token = localStorage.getItem('jwt_capullos-de-flor');
  const cartButton = document.getElementById('cart-button');
  // 🔥 Ya no tocamos scrollToBottomButton

  if (token) {
    document.querySelectorAll('.auth-required').forEach((elem) => {
      elem.style.display = 'inline-block';
    });
    document.querySelector('.container-botones').style.display = '';

    // 🔥 solo ocultar carrito, no el botón de scroll
    if (cartButton) cartButton.style.display = 'none';
  } else {
    document.querySelectorAll('.auth-required').forEach((elem) => {
      elem.style.display = 'none';
    });
    document.querySelector('.container-botones').style.display = 'none';

    if (cartButton) cartButton.style.display = 'flex';
  }
}

// Función para actualizar la página
function updateContent() {
  window.location.reload();
}


// Initialize MercadoPago with public key
const mp = new MercadoPago('APP_USR-109a0809-067e-4724-b997-c0d129201788', {
  locale: 'es-AR'
});

// Function to create payment preference and redirect to MercadoPago checkout
function handlePayment(totalAmount) {
  fetch('https://octopus-app.com.ar/casa-vera/create_preference', {

    // fetch('http://localhost:3001/create_preference', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Total Compra',  // Título del pago
      quantity: 1,            // Cantidad de productos (puede ajustarse)
      price: totalAmount      // El total capturado del carrito
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(preference => {
      // Asegurarse de que el SDK de MercadoPago esté cargado en el cliente
      if (typeof mp !== 'undefined') {
        // Redireccionar al checkout de MercadoPago con el ID de la preferencia
        mp.checkout({
          preference: {
            id: preference.id  // El ID de la preferencia creada
          },
          autoOpen: true  // Abrir automáticamente el checkout
        });
      } else {
        console.error("MercadoPago SDK not loaded.");
      }
    })
    .catch(error => {
      console.error('Error creating payment preference:', error);
    });
}

function toggleVisibility(item, button) {
  const itemId = item.dataset.id;
  const hidden = item.style.opacity === '0.3' ? 0 : 1;  // Determinar si está oculto o visible

  // Enviar el cambio al servidor
  fetch(`https://octopus-app.com.ar/casa-vera/api/menu/${itemId}/visibility`, {

    // fetch(`http://localhost:3001/api/menu/${itemId}/visibility`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hidden })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        if (hidden) {
          item.style.opacity = '0.3';  // Cambiar opacidad a oculto
          button.textContent = 'Mostrar';  // Cambiar texto a "Mostrar"
        } else {
          item.style.opacity = '1';  // Cambiar opacidad a visible
          button.textContent = 'Ocultar';  // Cambiar texto a "Ocultar"
        }
      }
    })
    .catch(err => console.error('Error updating visibility:', err));
}

document.addEventListener("DOMContentLoaded", function () {

  checkAuthentication();

  // const button = document.createElement('button');
  // button.innerHTML = '↻ Actualizar';
  // button.className = 'update-button auth-required';
  // button.addEventListener('click', updateContent);
  // document.body.appendChild(button);

  // Añadir un evento click al botón "Iniciar Sesión"
  // Añadir un evento click al botón "Iniciar Sesión"
  document.getElementById('login-button').addEventListener('click', function () {
    Swal.fire({
      title: 'Iniciar Sesión',
      html:
        '<input id="swal-username" class="swal2-input" placeholder="Usuario">' +
        '<input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">',
      focusConfirm: false,
      preConfirm: () => {
        return {
          username: document.getElementById('swal-username').value,
          password: document.getElementById('swal-password').value
        };
      }
    }).then((result) => {  // Asegúrate de que este bloque esté dentro de la llamada a Swal.fire
      if (result.isConfirmed) {
        // Enviar estas credenciales al servidor

        fetch('https://octopus-app.com.ar/casa-vera/api/auth/login', {
          // fetch('http://localhost:3001/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(result.value)
        })
          .then(response => response.json())
          .then(data => {
            if (data.auth) {
              localStorage.setItem('jwt_casa-vera', data.token);
              window.location.reload();  // Recargar la página

            } else {
              console.log('Credenciales inválidas');
            }
          });
      }
    });
  });
  function loadMenuItems() {
    const localVersion = localStorage.getItem('menuVersion');
    // return fetch('http://localhost:3001/api/menuVersion')
    return fetch('https://octopus-app.com.ar/casa-vera/api/menuVersion')
      .then(response => response.json())
      .then(serverVersionData => {
        const serverVersion = serverVersionData.version;

        if (localVersion !== serverVersion) {
          // Si la versión del servidor es diferente, obtén los datos del menú desde el servidor
          return fetchMenuDataFromServer();
        } else {
          // Si no, usa los datos almacenados localmente
          const menuData = JSON.parse(localStorage.getItem('menuData'));
          renderMenuItems(menuData);
          const token = localStorage.getItem('jwt_casa-vera');
          if (token) {
            makeMenuSortable();
          }
        }
      }); // Cierre de then() para fetch('/api/menuVersion')
  } // Cierre de loadMenuItems()

  function fetchMenuDataFromServer() {
    return fetch('https://octopus-app.com.ar/casa-vera/api/menu')

      // return fetch('http://localhost:3001/api/menu')
      .then(response => response.json())
      .then(data => {
        localStorage.setItem('menuData', JSON.stringify(data.data));
        localStorage.setItem('menuVersion', data.version); // Asume que el servidor envía una 'versión'
        renderMenuItems(data.data);
        const token = localStorage.getItem('jwt_casa-vera');
        if (token) {
          makeMenuSortable();
        }
      });
  }

  function makeMenuSortable() {
    const menuGroups = document.querySelectorAll('.menu-group');
    const menuSections = document.querySelectorAll('.menu-section');
    const container = document.querySelector('.container');
    const containerBotones = document.querySelector('.container-botones');
    let sortableEnabled = false;

    let switchButton = document.querySelector('.switch-button');
    if (!switchButton) {
      switchButton = document.createElement('button');
      switchButton.classList.add('switch-button', 'auth-required');

      const icon = document.createElement('img');
      icon.src = 'img/touch_app_24dp_108DEE_FILL0_wght400_GRAD0_opsz24.png';
      icon.alt = 'Icono';
      icon.classList.add('button-icon');
      switchButton.appendChild(icon);
      switchButton.appendChild(document.createTextNode('Habilitar arrastre'));

      if (containerBotones) {
        containerBotones.appendChild(switchButton);
      }
    }
    let ordersButton = document.querySelector('.orders-button');
    if (!ordersButton) {
      ordersButton = document.createElement('button');
      ordersButton.classList.add('orders-button', 'auth-required');

      const icon = document.createElement('img');
      icon.src = 'img/shopping_cart_28dp_007BFF_FILL0_wght400_GRAD0_opsz24.png'; // Reemplaza con un ícono de pedidos si lo deseas
      icon.alt = 'Ícono de Pedidos';
      icon.classList.add('button-icon');
      ordersButton.appendChild(icon);

      ordersButton.appendChild(document.createTextNode('Pedidos'));

      // Agregar evento de clic para redirigir
      ordersButton.addEventListener('click', () => {
        window.location.href = '/casa-vera/admin.html';
      });

      if (containerBotones) {
        containerBotones.appendChild(ordersButton);
      }
    }
    switchButton.addEventListener('click', toggleSortable);

    function toggleSortable() {
      sortableEnabled = !sortableEnabled;
      updateButtonState();
      resetSortableInstances();

      if (sortableEnabled) {
        enableSortable();
      }
    }

    function updateButtonState() {
      switchButton.childNodes[1].textContent = sortableEnabled ? 'Deshabilitar arrastre' : 'Habilitar arrastre';
    }

    function resetSortableInstances() {
      menuGroups.forEach(menuGroup => {
        if (menuGroup.sortableInstance) {
          menuGroup.sortableInstance.destroy();
          delete menuGroup.sortableInstance;
        }
      });

      menuSections.forEach(menuSection => {
        if (menuSection.sortableInstance) {
          menuSection.sortableInstance.destroy();
          delete menuSection.sortableInstance;
        }
      });

      if (container.sortableInstance) {
        container.sortableInstance.destroy();
        delete container.sortableInstance;
      }
    }

    function enableSortable() {
      // Permitir arrastrar los grupos completos dentro del contenedor principal
      if (!container.sortableInstance) {
        container.sortableInstance = new Sortable(container, {
          animation: 150,
          handle: '.group-title', // Drag handle para grupos
          ghostClass: 'sortable-ghost',
          scroll: true, // 🔹 Activa auto-scroll
          scrollSensitivity: 100, // 🔹 Ajusta la sensibilidad del scroll
          scrollSpeed: 10, // 🔹 Controla la velocidad del scroll
          group: "groups",
          onStart: evt => {
            if (!sortableEnabled) {
              evt.preventDefault();
            }
          },
          onEnd: evt => handleOnEnd(evt, container, 'groups')
        });
      }

      // Hacer arrastrables las secciones dentro de cada grupo
      menuGroups.forEach(menuGroup => {
        if (!menuGroup.sortableInstance) {
          menuGroup.sortableInstance = new Sortable(menuGroup, {
            animation: 150,
            handle: '.section-title', // Drag handle para secciones dentro de los grupos
            ghostClass: 'sortable-ghost',
            scroll: true, // 🔹 Activa auto-scroll
            scrollSensitivity: 100, // 🔹 Ajusta la sensibilidad
            scrollSpeed: 10, // 🔹 Controla la velocidad
            group: "sections",
            onStart: evt => {
              if (!sortableEnabled) {
                evt.preventDefault();
              }
            },
            onEnd: evt => handleOnEnd(evt, menuGroup, 'sections')
          });
        }
      });

      // Hacer arrastrables los elementos dentro de cada sección
      menuSections.forEach(menuSection => {
        if (!menuSection.sortableInstance) {
          menuSection.sortableInstance = new Sortable(menuSection, {
            animation: 150,
            handle: '.item-content', // Drag handle para items
            ghostClass: 'sortable-ghost',
            scroll: true, // 🔹 Activa auto-scroll
            scrollSensitivity: 100, // 🔹 Ajusta la sensibilidad
            scrollSpeed: 10, // 🔹 Controla la velocidad
            group: "items",
            onStart: evt => {
              if (!sortableEnabled) {
                evt.preventDefault();
              }
            },
            onEnd: evt => handleOnEnd(evt, menuSection, 'items')
          });
        }
      });
    }


    function handleOnEnd(evt, element, type) {
      if (!sortableEnabled) return;

      let items = Array.from(element.children).map((item, index) => ({
        id: item.dataset.id ? item.dataset.id.trim() : null, // 🔹 Asegurar que id es válido
        position: index
      }));

      // 🔹 Filtrar elementos sin id válido (null, undefined o vacío)
      items = items.filter(item => item.id && item.id !== "null");

      let apiEndpoint = '';
      let bodyData = {};

      if (type === 'groups') {
        apiEndpoint = `https://octopus-app.com.ar/casa-vera/api/groups/order`;
        bodyData = { groups: items };
      } else if (type === 'sections') {
        apiEndpoint = `https://octopus-app.com.ar/casa-vera/api/sections/order`;
        bodyData = { sections: items }; // 🔹 Asegurar que la clave es "sections"
      } else if (type === 'items') {
        apiEndpoint = `https://octopus-app.com.ar/casa-vera/api/menu/order`;
        bodyData = { items: items };
      } else {
        console.error(`Tipo inválido: ${type}. Endpoint no encontrado.`);
        return;
      }

      // 🔍 REGISTRO PARA DEPURACIÓN
      console.log("Enviando a API (corregido):", JSON.stringify(bodyData)); // 🔹 Verifica la nueva salida

      fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_casa-vera')}`
        },
        body: JSON.stringify(bodyData) // 🔹 Asegurar que el body tiene el formato correcto
      })
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`HTTP ${response.status}: ${text}`);
            });
          }
          return response.json();
        })
        .then(data => console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} ordenado correctamente`))
        .catch(error => {
          console.error(`Error al ordenar ${type}:`, error);
        });
    }


  }

  makeMenuSortable();


  //  evento edición del precio de envío
  const editDeliveryPriceButton = document.getElementById('edit-delivery-price-button');
  if (editDeliveryPriceButton) {

    editDeliveryPriceButton.addEventListener('click', function () {
      // Obtener el precio actual desde la API
      fetch('https://octopus-app.com.ar/casa-vera/api/delivery')
        // fetch('http://localhost/pedidos/api/delivery')

        .then(response => response.json())
        .then(data => {
          const currentPrice = data.price || 0;

          // Mostrar popup para editar el precio
          Swal.fire({
            title: 'Editar Precio de Envío',
            input: 'text',
            inputValue: currentPrice.toFixed(2),
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: (newPrice) => {
              // Validar que el nuevo precio sea un número válido
              if (isNaN(newPrice) || parseFloat(newPrice) < 0) {
                Swal.showValidationMessage('Por favor, ingresa un precio válido');
                return false;
              }

              // Enviar el nuevo precio al backend
              return fetch('https://octopus-app.com.ar/casa-vera/api/delivery', {

                // return fetch('http://localhost:3001/api/delivery', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('casa-vera')}`
                },
                body: JSON.stringify({ price: parseFloat(newPrice) })
              })
                .then(response => response.json())
                .then(data => {
                  if (data.success) {
                    Swal.fire('Guardado', 'El precio de envío ha sido actualizado', 'success');
                  } else {
                    Swal.fire('Error', 'No se pudo actualizar el precio de envío', 'error');
                  }
                });
            }
          });
        });
    });
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function renderMenuItems(menuData) {
    const container = document.querySelector('.container');

    container.querySelectorAll('.menu-section').forEach(section => section.remove());
    container.querySelectorAll('.menu-group').forEach(group => group.remove());

    const isAuthenticated = !!localStorage.getItem('jwt_casa-vera');
    const lastCreatedId = localStorage.getItem('lastCreatedItemId');

    const parentContainers = PARENT_GROUPS.reduce((containers, group) => {
      const groupContainer = document.createElement('div');
      groupContainer.className = 'menu-group';
      groupContainer.setAttribute('data-group', group.id);
      const hasParallax = group.id === 'seccionunica' || group.id === 'accesorios';
      const parallaxHTML = hasParallax ? `
          <div class="parallax-container">
              <img src="img/Paralax ${group.id === 'seccionunica' ? '1' : '2'} frase.webp">
              <h3 class="parallax-text"></h3>
          </div>
        ` : '';
      groupContainer.innerHTML = `
        <span class="group-header">
            ${parallaxHTML}
            <h1 class="group-title">${group.title}</h1>
            <p class="group-description">${group.description}</p>
        </span>
        `;

      container.appendChild(groupContainer);
      containers[group.id] = groupContainer;
      return containers;
    }, {});
    const sections = {};
    menuData.forEach(item => {
      const parentGroup = item.parent_group || 'seccionunica';
      const sectionKey = `${parentGroup}-${item.tipo}`;

      if (!sections[sectionKey]) {
        const menuSection = document.createElement('div');
        menuSection.className = 'menu-section';
        menuSection.setAttribute('data-id', item.section_id);
        menuSection.setAttribute('data-type', item.tipo);
        menuSection.innerHTML = `
          <h2 class="section-title">
            <span>${capitalizeFirstLetter(item.tipo.toLowerCase())}</span>
          </h2>
        `;

        sections[sectionKey] = menuSection;
        parentContainers[parentGroup].appendChild(menuSection);
      }

      const newItem = createMenuItem(item);
      newItem.dataset.id = item.id;
      newItem.dataset.hidden = item.hidden;

      const menuItem = newItem.querySelector('.menu-item');

      const buttonsContainer = document.createElement('span');
      buttonsContainer.className = 'admin-buttons-container';

      const editButton = menuItem.querySelector('.edit-button');
      if (editButton) buttonsContainer.appendChild(editButton);

      const hideShowButton = document.createElement('button');
      hideShowButton.className = 'hide-show-button auth-required';
      hideShowButton.textContent = item.hidden ? 'Mostrar' : 'Ocultar';
      hideShowButton.addEventListener('click', () => toggleVisibility(newItem, hideShowButton));
      buttonsContainer.appendChild(hideShowButton);

      menuItem.appendChild(buttonsContainer);

      if (item.hidden) {
        newItem.style.display = isAuthenticated ? 'block' : 'none';
        newItem.style.opacity = isAuthenticated ? '0.3' : '1';
      }

      // Insertar como primer hijo visible después del título
      const section = sections[sectionKey];
      const afterTitle = section.querySelector('h2.section-title')?.nextSibling;
      section.insertBefore(newItem, afterTitle || null);


    });

    checkAuthentication();
    const tipo = localStorage.getItem('lastCreatedItemTipo');
    const grupo = localStorage.getItem('lastCreatedItemGrupo');

    if (tipo && grupo) {
      const targetSelector = `.menu-group[data-group="${grupo}"] .menu-section[data-type="${tipo}"]`;

      const waitForOffset = (callback) => {
        const section = document.querySelector(targetSelector);
        if (section && section.offsetTop > 0) {
          window.scrollTo({
            top: section.offsetTop - 100,
            behavior: 'auto'
          });
          localStorage.removeItem('lastCreatedItemTipo');
          localStorage.removeItem('lastCreatedItemGrupo');
          if (callback) callback();
        } else {
          requestAnimationFrame(() => waitForOffset(callback));
        }
      };

      waitForOffset(() => {
        if (typeof AOS !== 'undefined') {
          AOS.refresh(); // ⚡ Solo después del scroll
        }
      });
    }

  }



  function loadTallesForItem(itemId) {
    fetch(`https://octopus-app.com.ar/casa-vera/api/menu/${itemId}/talles`)
      .then(response => response.json())
      .then(tallesData => {
        const talleSelect = document.querySelector(`.menu-item[data-id="${itemId}"] .talle-select`);
        const colorSelect = document.querySelector(`.menu-item[data-id="${itemId}"] .color-select`);
        if (!talleSelect) return;

        talleSelect.innerHTML = '<option value="" disabled selected>Talle</option>';
        if (colorSelect) {
          colorSelect.innerHTML = '<option value="" disabled selected>Color</option>';
        }

        const stockMap = tallesData.data || {};
        Object.keys(stockMap).forEach(talle => {
          const tieneStock = stockMap[talle].some(item => item.cantidad > 0);
          if (tieneStock) {
            const option = document.createElement('option');
            option.value = talle;
            option.textContent = talle;
            talleSelect.appendChild(option);
          }
        });

        // Actualizar colores al cambiar talle
        talleSelect.addEventListener('change', function () {
          const seleccionado = this.value;
          if (!colorSelect || !stockMap[seleccionado]) return;

          colorSelect.innerHTML = '<option value="" disabled selected>Color</option>';
          stockMap[seleccionado].forEach(({ color }) => {
            const opt = document.createElement('option');
            opt.value = color;
            opt.textContent = color;
            colorSelect.appendChild(opt);
          });
        });
      })
      .catch(err => console.error('Error cargando talles:', err));
  }


  function createMenuItem(item) {
    const imageUrl = item.img_url || '';
    let imgTag = imageUrl ? `<img src="${imageUrl}" alt="${item.nombre}" onerror="this.onerror=null; this.src='';" />` : '';

    const priceAndButton = `
        <div class="price-button-container">
          <span class="item-price ${item.subelement ? 'with-description' : ''}">$${formatPrice(item.precio)}</span>
          <button class="add-to-cart-btn" data-id="${item.id}" data-name="${item.nombre}" data-price="${item.precio}">+</button>
        </div>
    `;

    const contenedorItems = document.createElement('span');
    contenedorItems.className = 'contenedor-items';

    const newItem = document.createElement('div');
    newItem.className = 'menu-item';
    newItem.dataset.id = item.id;

    newItem.innerHTML = `
        <div class="item-header">${imgTag}</div>
        <div class="item-content" data-aos="fade-up">
            <h3 class="item-title ${item.subelement ? 'porciones-title' : ''}">${item.nombre}</h3>
            ${priceAndButton}
            <p class="item-description">${item.descripcion}</p>
        </div>
    `;

    const editButton = document.createElement('button');
    editButton.classList.add('edit-button', 'auth-required');
    editButton.textContent = 'Editar';
    newItem.appendChild(editButton);

    const talleWrapper = document.createElement('div');
    talleWrapper.className = 'talle-wrapper';

    const talleDropdown = document.createElement('select');
    talleDropdown.className = 'talle-select';
    talleDropdown.innerHTML = `<option value="" disabled selected>Talle</option>`;

    const colorDropdown = document.createElement('select');
    colorDropdown.className = 'color-select';
    colorDropdown.innerHTML = `<option value="" disabled selected>Color</option>`;
    colorDropdown.addEventListener('mousedown', function (e) {
      if (!talleDropdown.value) {
        e.preventDefault(); // evita que se abra el select
        Swal.fire({
          icon: 'info',
          title: 'Primero elegí un talle',
          text: 'Debes seleccionar un talle antes de elegir un color.',
          confirmButtonText: 'Aceptar',
          customClass: { popup: 'mi-alerta-personalizada' }
        });
      }
    });

    // Mapeo de stock para almacenar colores disponibles por talle
    let stockMap = {};

    fetch(`https://octopus-app.com.ar/casa-vera/api/menu/${item.id}/talles`)
      .then(response => response.json())
      .then(stockData => {
        if (stockData.data) {
          stockMap = stockData.data;
          Object.keys(stockMap).forEach(talle => {
            if (stockMap[talle].length > 0) {
              const option = document.createElement('option');
              option.value = talle;
              option.textContent = talle;
              talleDropdown.appendChild(option);
            }
          });

          // Cuando cambia el talle, actualizar los colores disponibles
          talleDropdown.addEventListener('change', function () {
            const selectedTalle = talleDropdown.value;
            colorDropdown.innerHTML = `<option value="" disabled selected>Color</option>`;

            if (stockMap[selectedTalle]) {
              stockMap[selectedTalle].forEach(({ color }) => {
                const colorOption = document.createElement('option');
                colorOption.value = color;
                colorOption.textContent = color;
                colorDropdown.appendChild(colorOption);
              });
            }
          });

          talleWrapper.appendChild(talleDropdown);
          talleWrapper.appendChild(colorDropdown);
          newItem.querySelector('.item-content').appendChild(talleWrapper);
        }
      })
      .catch(err => {
        console.error('Error fetching stock data:', err);
      });

    contenedorItems.appendChild(newItem);

    return contenedorItems;
  }


  // Crear el overlay si no existe
  let overlay = document.querySelector('.overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
  }

  // Evento para abrir el popup del carrito al hacer clic en el botón flotante
  document.getElementById('cart-button').addEventListener('click', function () {
    const cart = JSON.parse(localStorage.getItem('cart')) || {};

    if (Object.keys(cart).length === 0) {
      // Si el carrito está vacío, mostrar un popup básico sin overlay
      const emptyCartPopup = document.createElement('div');
      emptyCartPopup.classList.add('cart-popup');
      emptyCartPopup.innerHTML = `
          <div class="cart-popup-content">
              <span class="close"><button class="close-cart-btn">X</button></span>
              <h2>Pedido</h2>
              <p>Tu carrito está vacío</p>
              <div class="btn-popup">
                  <button class="continue-shopping-btn">Seguir Comprando</button>
              </div>
          </div>
      `;
      document.body.appendChild(emptyCartPopup);

      // Eventos para cerrar el popup
      document.querySelector('.close-cart-btn').addEventListener('click', () => {
        document.body.removeChild(emptyCartPopup);
      });
      document.querySelector('.continue-shopping-btn').addEventListener('click', () => {
        document.body.removeChild(emptyCartPopup);
      });

    } else {
      // Si el carrito tiene productos, llamar a showCartPopup y aplicar overlay
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
      showCartPopup();
    }
  });

  function confirmOrder(formattedDate) {
    const cart = JSON.parse(localStorage.getItem('cart')) || {};
    const orderNumber = Math.floor(Math.random() * 10000);
    const orderId = `P${orderNumber}`;
    const deliveryMethod = document.querySelector('input[name="delivery-method"]:checked')?.value || 'pickup';
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value || 'No especificado';

    let orderDetails = `*Hola, quiero realizar mi pedido.*\n\n`;
    orderDetails += `🛒 *Nro:* *${orderId}*\n`;
    orderDetails += `📅 ${formattedDate}\n`;
    orderDetails += `🛵 *Envío:* ${deliveryMethod === 'delivery' ? 'Envío a domicilio' : 'Retiro en local'}\n`;
    

    let address = '';
    if (deliveryMethod === 'delivery') {
      address = document.getElementById('delivery-address')?.value.trim();
      if (!address) {
        Swal.fire('Error', 'Debes ingresar una dirección de entrega.', 'error');
        return;
      }
      orderDetails += `🏠 *Dirección:* ${address}\n`;
    }

    orderDetails += `💳 *Pago:* ${paymentMethod}\n\n`;
    orderDetails += `*Productos:*\n`;

    let total = 0;
    const items = Object.entries(cart).map(([key, product]) => {
      if (!product.quantity || !product.price) {
        console.error("Producto inválido:", product);
        return null;
      }
      
      
      // Extraer `product_id`, `talle`, `color` desde la clave '18-4-verde'
      const [productId, talle, color] = key.split('-');

      total += product.price * product.quantity;
      const talleText = talle ? `Talle: *${talle}*` : 'Talle: *N/A*';
      const colorText = color ? `Color: *${color}*` : 'Color: *N/A*';

      orderDetails += `- 🍽️ *${product.name}* x${product.quantity} - *$${formatPrice(product.price * product.quantity)}*\n`;

      return {
        product_id: parseInt(productId),
        talle: talle || null, // Permitir valores `NULL`
        color: color || null, // Permitir valores `NULL`
        quantity: product.quantity,
        price_at_time: product.price,
        status: "pending",
        details: orderDetails // ✅ Se pasa el detalle a cada item
      };
    }).filter(item => item !== null);

    updateCartTotal().then((totalUpdated) => {
      total = totalUpdated;
      orderDetails += `\n💲 *Total:* *$${formatPrice(total.toFixed(2))}*\n`;

      sendOrder(orderId, items, orderDetails, deliveryMethod, paymentMethod, address, total);
    });
  }

  function sendOrder(orderId, items, orderDetails, deliveryMethod, paymentMethod, address, total) {
    const orderData = {
      id: orderId,
      total: total,
      delivery_method: deliveryMethod,
      payment_method: paymentMethod,
      address: address,
      items: items
    };

    console.log("📤 Enviando orden:", orderData);

    fetch('https://octopus-app.com.ar/casa-vera/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          Swal.fire('Pedido Confirmado', 'Tu pedido ha sido enviado con éxito.', 'success');

          // ✅ Enviar mensaje por WhatsApp
          const whatsappNumber = "5492995951765";
          const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(orderDetails)}`;
          window.open(whatsappLink, '_blank');

          // ✅ Vaciar carrito después de la compra
          localStorage.removeItem('cart');

          // ✅ Cerrar el popup del carrito
          const cartPopup = document.querySelector('.cart-popup');
          const overlay = document.querySelector('.overlay');
          if (cartPopup) document.body.removeChild(cartPopup);
          if (overlay) overlay.style.display = 'none';
          document.body.style.overflow = '';
        } else {
          throw new Error("Error en la respuesta del servidor");
        }
      })
      .catch(error => {
        console.error('Error al enviar el pedido:', error);
        Swal.fire('Error', 'No se pudo procesar el pedido. Inténtalo más tarde.', 'error');
      });
  }


  function showCartPopup() {
    const cart = JSON.parse(localStorage.getItem('cart')) || {};
    let cartContent = '';
    let total = 0;

    const formattedDate = formatDateArgentina(new Date());

    if (Object.keys(cart).length === 0) {
      cartContent = '<p>Tu carrito está vacío</p>';
    } else {
      fetch('https://octopus-app.com.ar/casa-vera/api/delivery')
        .then(response => response.json())
        .then(data => {
          const deliveryPrice = data.price || 0;

          cartContent += `<p class="fecha">${formattedDate}</p>`;

          const sections = {};
          for (const productId in cart) {
            const product = cart[productId];
            const sectionName = product.section || "Otros";

            if (!sections[sectionName]) {
              sections[sectionName] = [];
            }

            sections[sectionName].push(product);
            total += product.totalPrice || 0;
          }

          for (const sectionName in sections) {
            const formattedSectionName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1).toLowerCase();
            cartContent += `<h3 class="nombre-seccion">${formattedSectionName}</h3>`;

            sections[sectionName].forEach(product => {
              const productTalle = '';  // 🔥 Talle oculto
              const productColor = '';  // 🔥 Color oculto
              const productTotalPrice = formatPrice((product.totalPrice || 0).toFixed(2));

              cartContent += `
                <div class="cart-item" data-id="${product.id}" data-talle="${product.talle || 'sin-talle'}" data-color="${product.color || 'sin-color'}">
                  <span class="container-uno"> 
                    <span class="detalles"><strong>${product.name}</strong></span> 
                    <span>
                      <button class="quantity-btn" data-action="decrease">-</button>
                      <input type="number" value="${product.quantity}" min="1" class="quantity-input" readonly>
                      <button class="quantity-btn" data-action="increase">+</button>
                    </span> 
                  </span>
                  <span class="container-uno">
                    <span class="product-total-price">$${productTotalPrice}</span>
                    <button class="remove-btn">Eliminar</button>
                  </span>
                </div>
              `;
            });
          }

          const cartPopup = document.createElement('div');
          cartPopup.classList.add('cart-popup');
          cartPopup.innerHTML = `
            <div id="popup-container" class="cart-popup-content">
                <span class="close"><button class="close-cart-btn">X</button></span>
                <span class="contenedor-uno">
                    <h2>Pedido</h2>
                    ${cartContent}
                </span>
                <span class="contenedor-dos">
                  <div class="delivery-options">
                    <h3>Entrega</h3>
                    <label class="contenedor radio">
                      Retiro en el local <input type="radio" name="delivery-method" value="pickup" checked> 
                    </label>
                    <a href="https://maps.app.goo.gl/iJTstYQEXCi1fZ2V7"><p>C H Rodriguez 543</p></a>
                    <label class="contenedor radio">
                      Envío a domicilio <input type="radio" name="delivery-method" value="delivery"> 
                    </label>
                    <div id="address-container" style="display: none;">
                      <input type="text" id="delivery-address" placeholder="Ingrese dirección">
                    </div>
                  </div>
                  <p><strong>Total: $<span id="ca-total">${formatPrice(total)}</span></strong></p>
                </span>
                <div class="payment-options">
                  <h4>Pago</h4>
                  <label>Transferencia<input type="radio" name="payment-method" value="Transferencia"></label><br>
                  <label>Efectivo<input type="radio" name="payment-method" value="Efectivo"></label><br>
                  <label>Tarjeta<input type="radio" name="payment-method" value="Tarjeta"></label>
                </div>
                <span class="container-mp">
                    <button id="pay-with-mp" class="pay-btn">
                        <img class="icono-mp" src="img/logo-mercado-pago-icone-1024.png"> Pagar con mercado pago
                    </button>
                </span>
                <div class="btn-popup">
                    <button class="continue-shopping-btn">Seguir Comprando</button> 
                    <span class="containe">
                        <button class="confirm-order-btn">
                            <img class="icono-wpp" src="img/wpp.png"> Confirmar
                        </button>
                    </span>
                </div>
<span class="vaciar-carrito-btn" id="clear-cart-button">Vaciar pedido</span>

</p>
            </div>
        `;
          document.body.appendChild(cartPopup);

          document.getElementById('pay-with-mp').addEventListener('click', function () {
            const total = parseFloat(document.getElementById('cart-total').textContent);
            handlePayment(total);
          });

          document.querySelector('.close-cart-btn').addEventListener('click', function () {
            document.body.removeChild(cartPopup);
            overlay.style.display = 'none';
            document.body.style.overflow = '';
          });

          document.querySelector('.continue-shopping-btn').addEventListener('click', function () {
            document.body.removeChild(cartPopup);
            overlay.style.display = 'none';
            document.body.style.overflow = '';
          });

          document.querySelector('.confirm-order-btn').addEventListener('click', function () {
            confirmOrder(formattedDate);
          });

          document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', handleQuantityChange);
          });

          document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', handleRemoveProduct);
          });

          document.querySelectorAll('input[name="delivery-method"]').forEach(radio => {
            radio.addEventListener('change', function () {
              const addressContainer = document.getElementById('address-container');
              addressContainer.style.display = this.value === 'delivery' ? 'block' : 'none';

              updateCartTotal().then((total) => {
                console.log(`Total actualizado con método de entrega: $${total}`);
              });
            });
          });
          document.getElementById('clear-cart-button').addEventListener('click', () => {
            localStorage.removeItem('cart');
            document.body.removeChild(document.querySelector('.cart-popup'));
            overlay.style.display = 'none';
            document.body.style.overflow = '';
          });

        });
    }
  }


  function handleQuantityChange(event) {
    const action = event.target.dataset.action;
    const cartItem = event.target.closest('.cart-item');
    const productId = cartItem.dataset.id;
    const talle = cartItem.dataset.talle || 'sin-talle';
    const color = cartItem.dataset.color || 'sin-color';
    const productKey = `${productId}-${talle}-${color}`;

    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    const product = cart[productKey];

    if (!product) return;

    if (action === 'increase') {
      product.quantity += 1;
    } else if (action === 'decrease') {
      if (product.quantity > 1) {
        product.quantity -= 1;
      } else {
        // Eliminar el producto si la cantidad llega a 0
        delete cart[productKey];
        cartItem.remove();
      }
    }

    if (cart[productKey]) {
      product.totalPrice = product.price * product.quantity;
      cartItem.querySelector('.quantity-input').value = product.quantity;
      cartItem.querySelector('.product-total-price').textContent = `$${product.totalPrice.toFixed(2)}`;
    }

    localStorage.setItem('cart', JSON.stringify(cart));

    updateCartTotal().then((total) => {
      document.getElementById('ca-total').textContent = `$${total.toFixed(2)}`;
    });
  }


  function handleRemoveProduct(event) {
    const cartItem = event.target.closest('.cart-item');
    if (!cartItem) return;

    // Obtener datos del producto
    const productId = cartItem.dataset.id;
    const talle = cartItem.dataset.talle || 'sin-talle';
    const color = cartItem.dataset.color || 'sin-color';
    const productKey = `${productId}-${talle}-${color}`;

    console.log('Intentando eliminar producto:', { productId, talle, color, productKey });

    // Obtener carrito y validar la existencia del producto
    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    if (cart[productKey]) {
      // Eliminar producto del carrito
      delete cart[productKey];
      localStorage.setItem('cart', JSON.stringify(cart));

      // Remover del DOM
      cartItem.remove();
      console.log(`Producto con clave ${productKey} eliminado del carrito.`);
    } else {
      console.warn(`No se pudo encontrar el producto con la clave: ${productKey}`);
    }

    // Actualizar el total del carrito
    updateCartTotal().then((total) => {
      document.getElementById('ca-total').textContent = `$${total.toFixed(2)}`;
      console.log(`Nuevo total del carrito: $${total}`);

      // Si el carrito queda vacío, mostrar mensaje
      if (Object.keys(cart).length === 0) {
        document.querySelector('.contenedor-uno').innerHTML = '<p>Tu carrito está vacío</p>';
      }
    });
  }




  function updateCartTotal() {
    const cart = JSON.parse(localStorage.getItem('cart')) || {};
    const subtotal = Object.values(cart).reduce((sum, product) => sum + (product.totalPrice || 0), 0);

    // Obtener método de entrega seleccionado
    const deliveryMethodElement = document.querySelector('input[name="delivery-method"]:checked');
    const isDelivery = deliveryMethodElement && deliveryMethodElement.value === 'delivery';

    // Retornar una promesa para manejar sincronización
    return new Promise((resolve) => {
      if (isDelivery) {
        fetch('https://octopus-app.com.ar/casa-vera/api/delivery')
          .then(response => response.json())
          .then(data => {
            const deliveryPrice = data.price || 0;
            renderTotal(subtotal, deliveryPrice); // Actualizar el total con envío
            resolve(subtotal + deliveryPrice); // Retornar el total calculado
          })
          .catch(() => {
            console.warn("Error al obtener el precio de envío. Usando 0 como predeterminado.");
            renderTotal(subtotal, 0);
            resolve(subtotal); // Retornar solo el subtotal en caso de error
          });
      } else {
        renderTotal(subtotal, 0); // Actualizar total sin envío
        resolve(subtotal); // Retornar el subtotal
      }
    });
  }

  function renderTotal(subtotal, deliveryPrice) {
    const total = subtotal + deliveryPrice;
    const cartTotalElement = document.getElementById('cart-total');
    if (cartTotalElement) {
      cartTotalElement.textContent = formatPrice(total);  // ✅ Aplicamos el formato correcto
    }
  }

  // Evento para manejar el clic en el botón "+"
  document.body.addEventListener('click', function (event) {
    if (event.target.classList.contains('add-to-cart-btn')) {
      const productId = event.target.dataset.id;
      const productName = event.target.dataset.name;
      const productPrice = parseFloat(event.target.dataset.price);

      addToCart(productId, productName, productPrice);
    }
  });

  function addToCart(productId, productName, productPrice) {
    let cart = JSON.parse(localStorage.getItem('cart')) || {};
    const productElement = document.querySelector(`.menu-item[data-id="${productId}"]`);

    if (!productElement) {
      console.warn(`Producto con ID ${productId} no encontrado en el DOM.`);
      return;
    }

    const selectedTalle = 'sin-talle';
    const selectedColor = 'sin-color';

    const menuSection = productElement.closest('.menu-section');
    const sectionName = menuSection ? menuSection.getAttribute('data-type') : '';

    let mainTitle = '';
    let current = productElement.previousElementSibling;

    if (productElement.querySelector('.item-title.porciones-title')) {
      while (current) {
        const titleElement = current.querySelector('.item-title:not(.porciones-title)');
        if (titleElement) {
          mainTitle = titleElement.textContent.trim();
          break;
        }
        current = current.previousElementSibling;
      }
    }

    const finalProductName = `${sectionName} ${mainTitle} ${productName}`.trim();
    const productKey = `${productId}-${selectedTalle}-${selectedColor}`;

    if (cart[productKey]) {
      cart[productKey].quantity += 1;
      cart[productKey].totalPrice = cart[productKey].price * cart[productKey].quantity;
    } else {
      cart[productKey] = {
        id: productId,
        name: finalProductName,
        price: productPrice,
        quantity: 1,
        totalPrice: productPrice,
        talle: selectedTalle,
        color: selectedColor
      };
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    showToast(finalProductName);
  }


  // Asignar el evento `click` una sola vez para evitar duplicados
  document.addEventListener("DOMContentLoaded", function () {
    document.body.addEventListener('click', function (event) {
      if (event.target.classList.contains('add-to-cart-btn')) {
        const productId = event.target.dataset.id;
        const productName = event.target.dataset.name;
        const productPrice = parseFloat(event.target.dataset.price);

        addToCart(productId, productName, productPrice);
      }
    });
  });

  // Función para mostrar la notificación con Toastify.js
  function showToast(productName) {
    Toastify({
      text: `${productName} se ha añadido a tu pedido.`,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: "linear-gradient(135deg, #007bff, #0056b3)",
        borderRadius: "8px",
        fontSize: "34px",


      },
    }).showToast();
  }
  // ✅ Inicializar stockArray en el ámbito global para asegurar su disponibilidad
  let stockArray = [];
  function updateMenuItemDOM(data) {
    const el = document.querySelector(`.menu-item[data-id="${data.id}"]`);
    if (!el) return;

    el.querySelector('.item-title').textContent = data.nombre;
    el.querySelector('.item-price').textContent = `$${formatPrice(data.precio)}`;
    el.querySelector('.item-description').textContent = data.descripcion;

    const img = el.querySelector('.item-header img');
    if (img && data.img_url) {
      const currentSrc = img.getAttribute('src');
      const newSrc = data.img_url;

      // Verificamos si la imagen realmente cambió (por nombre o timestamp)
      if (!currentSrc.endsWith(newSrc)) {
        img.classList.add('fade-transition');
        img.style.opacity = 0;

        img.onload = () => {
          img.style.opacity = 1;
          img.classList.remove('fade-transition');
        };

        img.setAttribute('src', newSrc);
      }
    }
  }


  document.body.addEventListener('click', async function (event) {
    if (event.target.classList.contains('edit-button')) {
      const itemElement = event.target.closest('.menu-item');
      const itemId = itemElement.dataset.id;
      const itemTitle = itemElement.querySelector('.item-title').textContent;
      const itemPrice = itemElement.querySelector('.item-price').textContent.substring(1);
      const itemDescription = itemElement.querySelector('.item-description').textContent;
      const itemType = event.target.closest('.menu-section').getAttribute('data-type');
      const imgElement = itemElement.querySelector('img');
      const itemImgUrl = imgElement ? imgElement.src : '';
      const currentParentGroup = event.target.closest('.menu-group').getAttribute('data-group');

      // ✅ Obtener secciones y stock actualizado desde el backend
      Promise.all([
        fetch('https://octopus-app.com.ar/casa-vera/api/sections').then((res) => res.json()),
        fetch(`https://octopus-app.com.ar/casa-vera/api/menu/${itemId}`).then((res) => res.json())
      ]).then(([sectionsData, itemData]) => {
        const sections = sectionsData.data;
        const parentGroupOptions = PARENT_GROUPS.map(
          (group) =>
            `<option value="${group.id}" ${group.id === currentParentGroup ? 'selected' : ''}>${group.title}</option>`
        ).join('');

        const sectionOptions = sections
          .map(
            (section) =>
              `<option value="${section.nombre}" ${section.nombre === itemType ? 'selected' : ''}>${section.nombre}</option>`
          )
          .join('');

        // ✅ Inicializar stock con la estructura correcta desde el backend
        let stockArray = itemData.stock
          ? Object.entries(itemData.stock).flatMap(([talle, colores]) =>
            colores.map(({ id, color, cantidad }) => ({ id, talle, color, cantidad }))
          )
          : [];

        // ✅ Función mejorada para renderizar y asignar eventos al stock
        function renderStockList() {
          const stockList = document.getElementById('stock-list');

          // Renderizar lista de stock desde stockArray
          stockList.innerHTML = stockArray
            .map(
              ({ id, talle, color, cantidad }) => `
      <li data-id="${id}" data-talle="${talle}" data-color="${color}" data-cantidad="${cantidad}">
        <span>T: ${talle} - ${color} - Cant: ${cantidad}</span>
        <button class="edit-stock-btn" data-id="${id}">✏️</button>
        <button class="delete-stock-btn" data-id="${id}">🗑️</button>
      </li>
    `
            )
            .join('');

          // ✅ Volver a asignar eventos después de renderizar
          stockList.querySelectorAll('.edit-stock-btn').forEach((btn) => {
            btn.addEventListener('click', (event) => {
              const li = event.target.closest('li');
              document.getElementById('new-talle').value = li.dataset.talle;
              document.getElementById('new-color').value = li.dataset.color;
              document.getElementById('new-cantidad').value = li.dataset.cantidad;

              // ⚠️ Remover este bloque, ya no eliminamos directamente
              // stockArray = stockArray.filter((item) => item.id !== parseInt(li.dataset.id, 10));
              // li.remove();

              // ✅ En lugar de eliminar, solo marcamos para edición
              document.getElementById('add-stock-btn').dataset.editingId = li.dataset.id;
            });
          });


          stockList.querySelectorAll('.delete-stock-btn').forEach((btn) => {
            btn.addEventListener('click', (event) => {
              const li = event.target.closest('li');
              const stockId = parseInt(li.dataset.id, 10);

              // ✅ Eliminar del stockArray antes de eliminar del DOM
              stockArray = stockArray.filter((item) => item.id !== stockId);
              li.remove(); // Eliminar visualmente sin recargar
            });
          });
        }

        const originalTipo = itemType;
        const originalGroup = currentParentGroup;


        // ✅ Abrir el modal de edición con SweetAlert2
        Swal.fire({
          title: 'Editar elemento',
          showCloseButton: true,
          showCancelButton: true,
          cancelButtonText: 'Eliminar',
          confirmButtonText: 'Guardar',
          html: `
            <input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${itemTitle}" />
            <input id="swal-input2" class="swal2-input" placeholder="Precio" value="${itemPrice}" />
            <input id="swal-input4" class="swal2-input" placeholder="Descripción" value="${itemDescription}" />
            <select id="swal-parent-group" class="swal2-input">${parentGroupOptions}</select>
            <select id="swal-input3" class="swal2-input">${sectionOptions}</select>
            <img src="${itemImgUrl}" alt="Imagen actual" style="max-width: 100%; max-height: 200px; display: block; margin: 10px auto;" />
            <input type="file" id="swal-image-upload" class="swal2-input" />
            <div id="stock-section">
              <h3>Cargá stock disponible</h3>
              <ul id="stock-list"></ul>
              <div class="container-stock">
                <span class="container-stockuno">
                  <input type="text" id="new-talle" class="swal2-input" placeholder="Talle" />
                  <input type="number" id="new-cantidad" class="swal2-input" placeholder="Cantidad" min="1" />
                </span>
                <input type="text" id="new-color" class="swal2-input" placeholder="Color" />
                <button id="add-stock-btn">Añadir Stock</button>
              </div>
            </div>
          `,
          didOpen: () => {
            // ✅ Renderizar lista de stock si existe
            renderStockList();
            const cancelButton = document.querySelector('.swal2-cancel');
            if (cancelButton) {
              cancelButton.addEventListener('click', () => {
                Swal.fire({
                  title: '¿Estás seguro?',
                  text: 'Esta acción eliminará el producto permanentemente.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Sí, eliminar',
                  cancelButtonText: 'Cancelar'
                }).then((result) => {
                  if (result.isConfirmed) {
                    deleteProduct(itemId); // ✅ Llamar a deleteProduct para eliminar
                  }
                });
              });
            }
            document.getElementById('add-stock-btn').addEventListener('click', function () {
              const talle = document.getElementById('new-talle').value.trim();
              const color = document.getElementById('new-color').value.trim();
              const cantidad = parseInt(document.getElementById('new-cantidad').value.trim(), 10);
              const editingId = this.dataset.editingId;

              if (talle && color && !isNaN(cantidad) && cantidad >= 0) {
                if (editingId) {
                  const index = stockArray.findIndex((item) => item.id === parseInt(editingId, 10));
                  if (index !== -1) {
                    stockArray[index] = { id: parseInt(editingId, 10), talle, color, cantidad };
                  }
                } else {
                  stockArray.push({ id: Date.now(), talle, color, cantidad });
                }

                // Limpiar
                document.getElementById('new-talle').value = '';
                document.getElementById('new-color').value = '';
                document.getElementById('new-cantidad').value = '';
                this.removeAttribute('data-editing-id');

                // 🔁 Ahora sí actualiza
                renderStockList();
              } else {
                Swal.fire('Error', 'Por favor, ingresa valores válidos.', 'error');
              }
            });




            // ✅ Escuchar cambios para actualizar opciones según el grupo padre
            document.getElementById('swal-parent-group').addEventListener('change', function () {
              const groupId = this.value;
              const sectionSelect = document.getElementById('swal-input3');
              sectionSelect.innerHTML = sections
                .filter((s) => s.parent_group === groupId)
                .map((s) => `<option value="${s.nombre}">${s.nombre}</option>`)
                .join('');
            }); const imageInput = document.getElementById('swal-image-upload');
            const previewImg = document.querySelector('.swal2-html-container img');

            imageInput.addEventListener('change', () => {
              const file = imageInput.files[0];
              if (file && previewImg) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  previewImg.removeAttribute('src'); // fuerza redibujo
                  setTimeout(() => {
                    previewImg.src = e.target.result; // ahora sí se actualiza
                  }, 30); // pequeño delay para forzar el repaint
                };
                reader.readAsDataURL(file);
              }
            });


          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            const nombre = document.getElementById('swal-input1').value.trim();
            const precio = parseInt(document.getElementById('swal-input2').value.replace(/\./g, ''), 10);
            const descripcion = document.getElementById('swal-input4').value.trim();
            const tipo = document.getElementById('swal-input3').value;
            const parent_group = document.getElementById('swal-parent-group').value;
            const img_url = document.querySelector('.swal2-popup img')?.src || '';

            const tipoCambiado = tipo !== originalTipo;
            const grupoCambiado = parent_group !== originalGroup;

            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('precio', precio);
            formData.append('descripcion', descripcion);
            formData.append('tipo', tipo);
            formData.append('parent_group', parent_group);
            formData.append('stock', JSON.stringify(stockArray));

            const imageInput = document.getElementById('swal-image-upload');
            if (imageInput.files.length > 0) {
              const compressedImage = await compressImage(imageInput.files[0], 0.7, 800, 600);
              const compressedFile = new File([compressedImage], 'imagen.webp', { type: 'image/webp' });
              formData.append('imagen', compressedFile);
            }

            fetch(`https://octopus-app.com.ar/casa-vera/api/menu/${itemId}`, {
              method: 'PUT',
              body: formData
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  if (tipoCambiado || grupoCambiado) {
                    Swal.fire('Elemento actualizado', 'success').then(() => {
                      window.location.reload();
                    });
                  } else {
                    loadTallesForItem(itemId);
                    const updatedImgUrl = data.img_url || img_url;
                    updateMenuItemDOM({ id: itemId, nombre, precio, descripcion, img_url: updatedImgUrl });

                    Swal.fire('Elemento actualizado', '', 'success');
                  }

                } else {
                  Swal.fire('Error', 'No se pudo actualizar.', 'error');
                }
              });
          }

        });
      });
    }

    // ✅ Eliminar stock sin alertas y mantener el popup abierto
    if (event.target.classList.contains('delete-stock-btn')) {
      const li = event.target.closest('li');
      const stockId = li.dataset.id;

      if (stockId) {
        fetch(`https://octopus-app.com.ar/casa-vera/api/stock/${stockId}`, {
          method: 'DELETE'
        })
          .then((response) => response.json())
          .then((data) => {
            // ✅ Verificamos si se eliminó correctamente (deleted > 0 indica éxito)
            if (data.deleted > 0) {
              // Eliminar del DOM inmediatamente
              li.remove();

              // Actualizar stockArray eliminando el stock del array
              stockArray = stockArray.filter((item) => item.id !== parseInt(stockId, 10));
            }
          })
          .catch((err) => console.error('❌ Error eliminando stock:', err));
      }
    }


    // ✅ Editar stock correctamente
    if (event.target.classList.contains('edit-stock-btn')) {
      const li = event.target.closest('li');
      document.getElementById('new-talle').value = li.dataset.talle;
      document.getElementById('new-color').value = li.dataset.color;
      document.getElementById('new-cantidad').value = li.dataset.cantidad;

      // ⚡️ Ya no eliminamos el stock existente, solo guardamos el ID para editarlo
      document.getElementById('add-stock-btn').dataset.editingId = li.dataset.id;
    }

  });


  function deleteProduct(productId) {
    console.log("Ejecutando deleteProduct para ID:", productId);

    fetch(`https://octopus-app.com.ar/casa-vera/api/menu/${productId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem('jwt_casa-vera')}`
      }
    })
      .then(response => response.json())
      .then(data => {
        console.log("Respuesta del servidor:", data);

        if (data.deleted > 0) {
          // ✅ Eliminar el elemento del DOM directamente
          const itemEl = document.querySelector(`.menu-item[data-id="${productId}"]`);
          if (itemEl) {
            const wrapper = itemEl.closest('.contenedor-items');
            if (wrapper) wrapper.remove();
          }

          Swal.fire("Eliminado", "El producto ha sido eliminado correctamente.", "success");
        } else {
          Swal.fire("Error", "No se pudo eliminar el producto.", "error");
        }
      })
      .catch(error => {
        console.error("❌ Error en la eliminación:", error);
        Swal.fire("Error", "Hubo un problema al eliminar el producto.", "error");
      });
  }



  function compressImage(file, quality = 0.85, maxWidth = 1000, maxHeight = 1000) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function () {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const scaleFactor = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * scaleFactor);
            height = Math.floor(height * scaleFactor);
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(blob => resolve(blob), 'image/webp', quality);
        };
      };
    });
  }
  document.getElementById('create-item-button').addEventListener('click', function () {
    fetch('https://octopus-app.com.ar/casa-vera/api/sections')
      .then(response => response.json())
      .then(data => {
        const sections = data.data;
        const sectionOptions = ''; // ❗️ Inicialmente vacío
        const parentGroupOptions = PARENT_GROUPS.map(group =>
          `<option value="${group.id}">${group.title}</option>`
        ).join('');

        // 🔥 función para renderizar secciones por grupo
        const renderSectionOptions = (groupId) => {
          const filtered = sections.filter(s => s.parent_group === groupId);
          return filtered.map(s => `<option value="${s.nombre}">${s.nombre}</option>`).join('');
        };

        Swal.fire({
          title: 'Crear nuevo elemento',
          html: `
                  <input id="swal-input1" class="swal2-input" placeholder="Nombre" />
                  <input id="swal-input2" class="swal2-input" placeholder="Precio" />
                  <input id="swal-input4" class="swal2-input" placeholder="Descripción" />
                  <input type="file" id="swal-file-upload" class="swal2-input" />
                  <select id="swal-parent-group" class="swal2-input">
                      <option value="" disabled selected>Seleccionar Sección</option>
                      ${parentGroupOptions}
                  </select>
                <select id="swal-input3" class="swal2-input">
    <option value="" disabled selected>Seleccionar Categoría</option>
</select>
<div id="new-section-input" style="display:none; margin-top: 10px;">
    <input id="swal-new-section" class="swal2-input" placeholder="Nombre de la nueva Categoría" />
</div>

                  <div id="new-section-input" style="display:none; margin-top: 10px;">
                      <input id="swal-new-section" class="swal2-input" placeholder="Nombre de la nueva Categoría" />
                  </div>
                  <label id="subelement">
                      <input type="checkbox" id="swal-subelement-checkbox"> ¿Es un subelemento?
                  </label>
                  <div id="stock-section">
                           <h3>Cargá stock disponible</h3>
                        <ul id="stock-list"></ul>
                        <div class="container-stock">
                          <span class="container-stockuno">
                            <input type="text" id="new-talle" class="swal2-input" placeholder="Talle" />
                            <input type="number" id="new-cantidad" class="swal2-input" placeholder="Cantidad" min="0" /> 
                            </span>
                            <input type="text" id="new-color" class="swal2-input" placeholder="Color" />
                          <button id="add-stock-btn">Añadir Stock</button>
                      </div>
                  </div>
              `,
          showCloseButton: true,
          focusConfirm: false,
          confirmButtonText: 'Confirmar',
          preConfirm: async () => {
            const nombre = document.getElementById('swal-input1').value.trim();
            const precio = document.getElementById('swal-input2').value.trim();
            const descripcion = document.getElementById('swal-input4').value.trim();
            const selectedParentGroup = document.getElementById('swal-parent-group').value;
            if (!selectedParentGroup) {
              Swal.showValidationMessage('Por favor, selecciona una sección antes de guardar.');
              return false; // ❌ Detener si no se seleccionó una sección
            }
            const formData = new FormData();
            formData.append('nombre', nombre);
            formData.append('precio', precio.replace(/\./g, ''));
            formData.append('descripcion', descripcion);
            formData.append('parent_group', selectedParentGroup);

            const tipo = document.getElementById('swal-input3').value;
            if (tipo === 'new-section') {
              const newSectionName = document.getElementById('swal-new-section').value.trim();
              if (!newSectionName) {
                Swal.showValidationMessage('Por favor, ingresa el nombre de la nueva Categoría');
                return false;
              }
              formData.append('tipo', 'new-section');
              formData.append('newSectionName', newSectionName);
            } else {
              formData.append('tipo', tipo);
            }

            const fileInput = document.getElementById('swal-file-upload');
            if (fileInput.files[0]) {
              const compressedImage = await compressImage(fileInput.files[0], 0.7, 800, 600);
              const compressedFile = new File([compressedImage], 'imagen.webp', { type: 'image/webp' });
              formData.append('imagen', compressedFile);
            }

            const stock = Array.from(document.querySelectorAll('#stock-list li')).map(li => ({
              talle: li.dataset.talle,
              color: li.dataset.color,
              cantidad: parseInt(li.dataset.cantidad, 10)
            })).filter(item => item.talle && item.color && !isNaN(item.cantidad) && item.cantidad >= 0);

            formData.append('stock', JSON.stringify(stock));
            formData.append('subelement', document.getElementById('swal-subelement-checkbox').checked);

            return formData;
          }
        }).then((result) => {
          if (result.isConfirmed) {
            const formData = result.value;
            const tipo = document.getElementById('swal-input3').value;
            const selectedParentGroup = document.getElementById('swal-parent-group').value;

            localStorage.setItem('lastCreatedItemTipo', tipo);
            localStorage.setItem('lastCreatedItemGrupo', selectedParentGroup);


            fetch('https://octopus-app.com.ar/casa-vera/api/menu', {
              method: 'POST',
              body: formData
            })
              .then(async response => {
                const data = await response.json();

                if (!response.ok) {
                  // 💬 Detectar error de sección ya existente
                  if (response.status === 400 && data.error?.includes("ya existe en")) {
                    Swal.fire('⚠️ Sección duplicada', data.error, 'warning');
                  } else {
                    Swal.fire('Error al crear el ítem', data.error || 'Error desconocido', 'error');
                  }
                  return;
                }

                if (data.id) {
                  Swal.fire('Elemento creado correctamente', '', 'success').then(() => {
                    // 👇 Solo recargamos datos
                    fetchMenuDataFromServer();
                  });



                } else {
                  Swal.fire('Error al crear el ítem', 'No se recibió confirmación de creación', 'error');
                }
              })
              .catch(err => Swal.fire('Error de red', err.message, 'error'));

          }
        });


        document.addEventListener('change', function (e) {
          if (e.target.id === 'swal-parent-group') {
            const groupId = e.target.value;
            const sectionSelect = document.getElementById('swal-input3');
            const newSectionHTML = `<option value="new-section">Nueva Categoría</option>`;

            // ✅ Verificar si NO se seleccionó ninguna sección
            if (!groupId) {
              sectionSelect.innerHTML = ''; // ❌ Vaciar opciones si no hay grupo seleccionado
              return; // ✅ Salir si no hay grupo seleccionado
            }

            // ✅ Obtener opciones filtradas si hay un grupo seleccionado
            const filteredOptions = renderSectionOptions(groupId);

            // ✅ Siempre incluir "Nueva Categoría" al final
            sectionSelect.innerHTML = filteredOptions
              ? `${filteredOptions}${newSectionHTML}`
              : newSectionHTML;

            // 🔥 Si solo hay "Nueva Categoría", seleccionarla automáticamente y forzar evento change
            if (!filteredOptions || sectionSelect.options.length === 1) {
              sectionSelect.value = 'new-section';
              sectionSelect.dispatchEvent(new Event('change')); // ✅ Forzar evento para mostrar el input
            }
          }
        });



        // Agregar evento para mostrar u ocultar el campo de nueva sección
        document.getElementById('swal-input3').addEventListener('change', function () {
          const newSectionInput = document.getElementById('new-section-input');
          if (this.value === 'new-section') {
            newSectionInput.style.display = 'block';
          } else {
            newSectionInput.style.display = 'none';
          }
        });

        document.getElementById('add-stock-btn').addEventListener('click', () => {
          const talle = document.getElementById('new-talle').value.trim();
          const color = document.getElementById('new-color').value.trim();
          const cantidad = parseInt(document.getElementById('new-cantidad').value.trim(), 10);

          if (talle && color && !isNaN(cantidad) && cantidad >= 0) {
            const li = document.createElement('li');
            li.dataset.talle = talle;
            li.dataset.color = color;
            li.dataset.cantidad = cantidad;
            li.innerHTML = `
                      T: ${talle} - ${color} - Cant: ${cantidad}
                     <button class="edit-stock-btn">✏️</button>
                        <button class="delete-stock-btn">🗑️</button>
                  `;
            document.getElementById('stock-list').appendChild(li);

            li.querySelector('.delete-stock-btn').addEventListener('click', () => li.remove());
            li.querySelector('.edit-stock-btn').addEventListener('click', () => {
              document.getElementById('new-talle').value = li.dataset.talle;
              document.getElementById('new-color').value = li.dataset.color;
              document.getElementById('new-cantidad').value = li.dataset.cantidad;
              li.remove();
            });

            document.getElementById('new-talle').value = '';
            document.getElementById('new-color').value = '';
            document.getElementById('new-cantidad').value = '';
          } else {
            alert('Por favor, ingresa un talle, color y cantidad válida.');
          }
        });
      });
  });



  const createAnnouncementButton = document.getElementById('create-announcement-button');
  if (createAnnouncementButton) {

    createAnnouncementButton.addEventListener('click', function () {
      fetch('https://octopus-app.com.ar/casa-vera/api/announcements') // Solicitud GET
        .then(response => response.json())
        .then(data => {
          let modalTitle = 'Crear Anuncio';
          let text = '';
          let paragraph = '';
          let stateChecked = '';
          let imageUrl = ''; // URL de la imagen del anuncio

          if (data.success && data.announcement) {
            // Si hay un anuncio activo, carga los datos en el modal
            modalTitle = 'Editar Anuncio';
            text = data.announcement.text || '';
            paragraph = data.announcement.paragraph || '';
            stateChecked = data.announcement.state ? 'checked' : '';
            imageUrl = data.announcement.image_url || ''; // Asegúrate de obtener la URL de la imagen correctamente
          }

          Swal.fire({
            title: modalTitle,
            showCloseButton: true,
            confirmButtonText: 'Confirmar',

            html: `
              <img src="${imageUrl}" alt="Imagen Actual" id="current-image-preview" style="max-width:300px;" onerror="this.style.display='none'"/> <!-- Muestra la imagen actual -->
              <input type="file" id="swal-image-upload" class="swal2-input"> <!-- Para cargar una nueva imagen -->
              <input id="swal-text" class="swal2-input" placeholder="Texto del anuncio" value="${text}">
              <input id="swal-paragraph" class="swal2-input" placeholder="Párrafo del anuncio" value="${paragraph}">
              <span class="check"><input type="checkbox" id="swal-state" class="swal2-checkbox" ${stateChecked}> Activo</span>
            `,
            focusConfirm: false,
            preConfirm: async () => {
              // ✅ Validar existencia de elementos antes de continuar
              const textInput = document.getElementById('swal-text');
              const paragraphInput = document.getElementById('swal-paragraph');
              const stateInput = document.getElementById('swal-state');
              const fileInput = document.getElementById('swal-image-upload');

              // ❗️ Si algún elemento no existe, mostrar error y detener proceso
              if (!textInput || !paragraphInput || !stateInput) {
                Swal.showValidationMessage('Por favor, completa todos los campos.');
                return false;
              }

              // ✅ Crear y rellenar FormData
              const formData = new FormData();
              formData.append('text', textInput.value.trim());
              formData.append('paragraph', paragraphInput.value.trim());
              formData.append('state', stateInput.checked);

              // ✅ Comprimir imagen si existe
              if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];

                try {
                  // 🎉 Comprimir la imagen antes de enviarla
                  const compressedBlob = await compressImage(file, 0.7, 800, 600);
                  const compressedFile = new File([compressedBlob], 'compressed-anuncio.webp', {
                    type: 'image/webp',
                  });

                  formData.append('image', compressedFile);
                } catch (err) {
                  console.error('Error al comprimir la imagen:', err);
                  Swal.showValidationMessage('Error al comprimir la imagen. Intenta de nuevo.');
                  return false;
                }
              }

              // ✅ Retornar el FormData comprimido para ser enviado al backend
              return formData;
            }

          }).then((result) => {
            if (result.isConfirmed) {
              fetch('https://octopus-app.com.ar/casa-vera/api/announcements', {
                method: 'POST',
                body: result.value, // Enviar el objeto FormData
              })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  return response.json(); // Parsea la respuesta como JSON
                })
                .then(data => {
                  if (data.success) {
                    Swal.fire('Éxito', 'El anuncio se ha creado/actualizado correctamente.', 'success');
                    console.log('Anuncio creado/actualizado con ID:', data.id);
                  } else {
                    Swal.fire('Error', data.error || 'No se pudo crear/actualizar el anuncio.', 'error');
                  }
                })
                .catch(err => {
                  console.error('Error al guardar el anuncio:', err);
                  Swal.fire('Error', 'No se pudo guardar el anuncio.', 'error');
                });
            }
          });
        })
        .catch(error => {
          console.error('Error al cargar el anuncio:', error);
          Swal.fire('Error', 'No se pudo cargar el anuncio.', 'error');
        });
    });
  }
  menuItemsPromise = loadMenuItems();

});

function showAnnouncementPopup(data) {
  if (!data) return; // No ejecutar si no hay datos precargados

  Swal.fire({
    title: data.text,
    html: `<p>${data.paragraph}</p>`,
    imageUrl: data.image_url, // Usar la imagen ya precargada
    imageWidth: 400,
    imageHeight: 200,
    imageAlt: 'Imagen del anuncio',
    confirmButtonText: 'Continuar',
    customClass: {
      popup: 'popup-anuncio' // Aquí asignamos una clase especial
    }
  });
}

// Función para cerrar la sesión
function simpleLogout() {
  localStorage.removeItem('jwt_casa-vera');
  window.location.reload();  // Recarga la página
}

// Vincula la función al evento click del botón "Cerrar Sesión"
document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {  // Comprueba si el botón existe en la página
    logoutButton.addEventListener('click', simpleLogout);
  }
});

function copyAlias() {
  var alias = document.getElementById('aliasText').innerText;
  var copyIcon = document.querySelector('.copy-icon');
  navigator.clipboard.writeText(alias)
    .then(() => {
      // Cambia el background-color a verde claro
      copyIcon.style.backgroundColor = '#4c4e4c';

      // Restablece el background-color después de 2 segundos
      setTimeout(() => {
        copyIcon.style.backgroundColor = ''; // Quita el color de fondo
      }, 2000);
    })
    .catch(err => {
      console.error('Error al copiar: ', err);
    });
}

const hamburger = document.getElementById('hamburger');
const navbarLinks = document.getElementById('navbar-links');

// Toggle the active class for the hamburger menu
hamburger.addEventListener('click', function () {
  hamburger.classList.toggle('active');
  navbarLinks.classList.toggle('active');
});

// Close the menu if scrolling
window.addEventListener('scroll', function () {
  navbarLinks.classList.remove('active');
  hamburger.classList.remove('active');
});


// Close the menu if scrolling
window.addEventListener('scroll', function () {
  navbarLinks.classList.remove('active');
  hamburger.classList.remove('active');
});

window.onscroll = function () {
  scrollFunction();
};

function capitalizeFirstLetter(string) {
  if (!string) return ''; // Evita errores si el string es null o undefined
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function loadMenuSections() {
  fetch('https://octopus-app.com.ar/casa-vera/api/sections')

    .then(response => response.json())
    .then(data => {
      const sections = data.data;
      const navbarLinks = document.getElementById('navbar-links');

      // Limpiar enlaces actuales
      navbarLinks.innerHTML = '';
      PARENT_GROUPS.forEach(group => {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'nav-group';

        // Crear enlace del grupo padre
        const parentLink = document.createElement('a');
        parentLink.href = '#';
        parentLink.className = 'parent-link';
        parentLink.dataset.group = group.id;
        parentLink.innerHTML = `${group.title} <img src="img/call_made_20dp_FILL0_wght400_GRAD0_opsz20.png" alt="">`;

        groupContainer.appendChild(parentLink);

        // Crear contenedor para los enlaces de sección de este grupo
        const sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'section-links';

        // Agregar enlaces de secciones del menú
        sections.forEach(section => {
          if (section.parent_group === group.id) {
            const link = document.createElement('a');
            link.href = '#';
            link.dataset.type = section.nombre;
            link.dataset.group = group.id;
            link.innerHTML = `${capitalizeFirstLetter(section.nombre)} <img src="img/call_made_20dp_FILL0_wght400_GRAD0_opsz20.png" alt="">`;
            sectionsContainer.appendChild(link);
          }
        });

        groupContainer.appendChild(sectionsContainer);
        navbarLinks.appendChild(groupContainer);
      });

      // Añadir eventos de click a todos los enlaces
      addNavbarLinkEvents();
    })
    .catch(err => {
      console.error('Error al cargar secciones del menú:', err);
    });
}

function addNavbarLinkEvents() {
  // Enlaces de sección
  const menuLinks = document.querySelectorAll('.navbar-links a[data-type]');
  menuLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetType = this.getAttribute('data-type');
      const targetGroup = this.getAttribute('data-group');

      // Primero encontrar el grupo correcto
      const targetGroupContainer = document.querySelector(`.menu-group[data-group="${targetGroup}"]`);
      if (!targetGroupContainer) return;

      // Luego buscar la sección dentro de ese grupo
      const targetSection = targetGroupContainer.querySelector(`.menu-section[data-type="${targetType}"]`);

      if (targetSection) {
        window.scrollTo({
          top: targetSection.offsetTop - 100, // Ajuste para el navbar fijo
          behavior: 'smooth'
        });
        navbarLinks.classList.remove('active');
        hamburger.classList.remove('active');
      }
    });
  });

  // Enlaces padre (grupos)
  const parentLinks = document.querySelectorAll('.navbar-links .parent-link');
  parentLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const groupContainer = this.parentElement;
      const sectionLinks = groupContainer.querySelector('.section-links');

      const isVisible = sectionLinks.style.display === 'block';
      sectionLinks.style.display = isVisible ? 'none' : 'block';

      // Toggle clase para rotar ícono
      this.classList.toggle('open', !isVisible);
    });
  });


}
function scrollFunction() {
  const navbar = document.querySelector('.navbar'); // Selecciona el navbar

  if (document.documentElement.scrollTop > 20) {
    // Si se hace scroll hacia abajo, muestra el navbar
    if (!navbar.classList.contains('visible')) {
      navbar.classList.add('visible');
    }
  } else {
    // Si se vuelve al tope, oculta el navbar
    if (navbar.classList.contains('visible')) {
      navbar.classList.remove('visible');
    }
  }
}

// Asocia la función al evento de scroll
window.addEventListener('scroll', scrollFunction);


window.addEventListener('scroll', () => {
  const parallaxContainers = document.querySelectorAll('.parallax-container img');
  parallaxContainers.forEach(img => {
    const container = img.closest('.parallax-container');
    const rect = container.getBoundingClientRect();

    // Define un umbral para "desembosar" antes
    const threshold = window.innerHeight * 0.55; // Ajusta según lo necesario

    // Si el contenedor está cerca o dentro del viewport
    if (rect.top <= window.innerHeight + threshold && rect.bottom >= -threshold) {
      const speed = 0.5; // Velocidad del efecto
      const yOffset = -((rect.top - threshold) * speed); // Aplica el umbral

      // Aplica el movimiento solo a la imagen
      img.style.transform = `translateY(${yOffset}px)`;
    }
  });
});

let announcementData = null; // Variable para guardar los datos del anuncio
let announcementImage = new Image(); // Precargar la imagen


// Precargar el anuncio antes de mostrar contenido
fetch('https://octopus-app.com.ar/casa-vera/api/announcements')
  .then(response => response.json())
  .then(data => {
    if (data.success && data.announcement && data.announcement.state) {
      announcementData = data.announcement;
      const announcementImage = new Image();
      announcementImage.src = data.announcement.image_url; // Precarga
    }
  })
  .catch(error => console.error("Error precargando el anuncio:", error));



document.addEventListener("DOMContentLoaded", function () {
  checkAuthentication();

  setTimeout(() => {
    document.getElementById('loader').classList.add('hide-loader');

    setTimeout(() => {
      document.getElementById('loader').style.display = 'none'; // Oculta completamente el loader
    }, 1000);

    // Mostrar el contenido de la app de forma gradual
    document.querySelector('.container').style.opacity = '1';
    document.querySelector('footer').style.opacity = '1';

    // Si el anuncio ya está precargado, mostrarlo inmediatamente
    setTimeout(() => {
      if (announcementData) {
        showAnnouncementPopup(announcementData);
      }
    }, 400);
  }, 2800);
});
function scrollToGroupTitle() {
  const target = document.querySelector(".group-title");
  if (target) {
    window.scrollTo({
      top: target.offsetTop,
      behavior: "smooth"
    });
    setTimeout(() => {
      window.scrollTo({
        top: target.offsetTop - 420,
        behavior: "smooth"
      });
    }, 1000);
  }
}
menuSectionsPromise = loadMenuSections();

function handleScrollForButtons() {
  const buttons = [
    document.getElementById('cart-button'),
    document.getElementById('scrollToTopButton'),
    document.getElementById('scrollToBottomButton'),
  ];
  const footer = document.getElementById('footer');
  if (!footer) return;

  const footerRect = footer.getBoundingClientRect();
  const isFooterVisible = footerRect.top < window.innerHeight;

  buttons.forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle('move-up', isFooterVisible);
  });
}

window.addEventListener('scroll', handleScrollForButtons);


// Agregar evento de scroll para detectar el final del scroll
window.addEventListener('scroll', handleScrollForButtons);
const frases = [
  "Vos también podés digitalizarte",
  "Sumate a la Comunidad Octopus",
];
let fraseIndex = 0;
const fraseElemento = document.getElementById("frase");

function cambiarFrase() {
  // Oculta la frase actual suavemente
  fraseElemento.style.opacity = 0;
  fraseElemento.style.transform = "translateX(-100%)";

  setTimeout(() => {
    // Cambia la frase después del tiempo de transición
    fraseIndex = (fraseIndex + 1) % frases.length;
    fraseElemento.textContent = frases[fraseIndex];

    // Restablece la posición para la nueva frase desde la derecha
    fraseElemento.style.transform = "translateX(100%)";

    setTimeout(() => {
      // Muestra la nueva frase entrando desde la derecha
      fraseElemento.style.opacity = 1;
      fraseElemento.style.transform = "translateX(0)";
    }, 50);
  }, 1000); // Tiempo de espera antes de cambiar la frase
}

// Inicia el carrusel de frases
setInterval(cambiarFrase, 4000); // Tiempo total para cambiar frase (4 segundos)
