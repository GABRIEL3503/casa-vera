function formatDateArgentina(date) {
    const options = { 
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return new Date(date).toLocaleString('es-AR', options);
}


document.addEventListener('DOMContentLoaded', loadOrders);

function formatDate(date) {
    const d = new Date(date);
    // Usar opciones específicas para mantener el formato actual
    const options = { 
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    };
    return new Date(d).toLocaleString('es-AR', options).split(',')[0];
}

function loadOrders() {
    fetch('https://octopus-app.com.ar/casa-vera/api/orders')
        .then(response => response.json())
        .then(orders => {
            const orderList = document.getElementById('orderList');
            orderList.innerHTML = '';
            
            // Agrupar por fecha (solo dd/mm/yy)
            const groupedOrders = {};
            orders.forEach(order => {
                const fecha = new Date(order.created_at);
                const date = fecha.toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    timeZone: 'America/Argentina/Buenos_Aires'
                });
                
                if (!groupedOrders[date]) {
                    groupedOrders[date] = [];
                }
                groupedOrders[date].push(order);
            });
            
            // Ordenar fechas (más reciente primero)
            Object.entries(groupedOrders)
                .sort((a, b) => {
                    const [diaA, mesA, añoA] = a[0].split('/');
                    const [diaB, mesB, añoB] = b[0].split('/');
                    return new Date(`20${añoB}/${mesB}/${diaB}`) - new Date(`20${añoA}/${mesA}/${diaA}`);
                })
                .forEach(([date, orders]) => {
                    // Crear grupo de fecha
                    const dateGroup = document.createElement('div');
                    dateGroup.className = 'date-group';
                    
                    // Mostrar solo fecha
                    const dateHeader = document.createElement('div');
                    dateHeader.className = 'date-header';
                    dateHeader.textContent = date;
                    dateGroup.appendChild(dateHeader);
                    
                    // Ordenar pedidos del día (últimos arriba)
                    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .forEach(order => {
                            const orderElement = createOrderElement(order);
                            dateGroup.appendChild(orderElement);
                        });
                    
                    orderList.appendChild(dateGroup);
                });
        });
}
function createOrderElement(order) {
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item';
    
    const orderButton = document.createElement('button');
    orderButton.className = `order-button ${order.status}`;
    orderButton.setAttribute('data-order-id', order.id);
    orderButton.innerHTML = `
        <span>${order.id}</span>
        <span>${order.status === 'pending' ? 'Pendiente' : 'Pagado'}</span>
    `;
    orderButton.onclick = () => toggleOrderStatus(order.id);

    const detailsButton = document.createElement('button');
    detailsButton.className = 'details-button';
    detailsButton.innerHTML = '→';
    detailsButton.onclick = () => showOrderDetails(order);

    orderItem.appendChild(orderButton);
    orderItem.appendChild(detailsButton);

    return orderItem;
}
function toggleOrderStatus(orderId) {
    // Obtener el botón del pedido
    const orderButton = document.querySelector(`.order-button[data-order-id="${orderId}"]`);

    if (!orderButton) {
        console.error('Botón no encontrado para el orderId:', orderId);
        return;
    }

    // Determinar el estado actual y el nuevo estado
    const isPaid = orderButton.classList.contains('paid');
    const newStatus = isPaid ? 'pending' : 'paid';
    const statusText = isPaid ? 'Pendiente' : 'Pagado';

    Swal.fire({
        title: '¿Cambiar estado del pedido?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, cambiar a ${statusText}`,
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`https://octopus-app.com.ar/casa-vera/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus }) // Enviar el nuevo estado
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(errorText => {
                        console.error('Error response:', errorText);
                        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Actualizar clases del botón para reflejar el nuevo estado
                    orderButton.classList.toggle('paid', newStatus === 'paid');
                    orderButton.classList.toggle('pending', newStatus === 'pending');
                    orderButton.querySelector('span:last-child').textContent = statusText;

                    Swal.fire(
                        '¡Estado actualizado!',
                        
                    );
                } else {
                    throw new Error(data.error || 'No se pudo actualizar el estado del pedido');
                }
            })
            .catch(error => {
                console.error('Error completo:', error);
                Swal.fire(
                    'Error',
                    `No se pudo actualizar el estado del pedido: ${error.message}`,
                    'error'
                );
            });
        }
    });
}

function cleanWhatsAppFormat(message) {
    return message
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\n\n/g, '\n')
        .trim();
}

function showOrderDetails(order) {
    const modal = document.getElementById('orderModal');
    const detailsContainer = document.getElementById('orderDetails');
    
    const lines = order.details.split('\n');
    // Eliminar la primera línea y empezar desde "Nro de Pedido"
    const relevantLines = lines.filter(line => !line.includes('Hola, quiero realizar mi pedido'));
    
    const cleanedDetails = relevantLines
      .join('\n')
      .replace(/\*(.*?)\*/g, '$1')  // Eliminar asteriscos
      .trim();
    
    detailsContainer.textContent = cleanedDetails;
    modal.style.display = 'flex';
  }
// Cerrar modal con el botón X
document.querySelector('.close-modal').onclick = function() {
    document.getElementById('orderModal').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

