import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarFacturaPDF = (datos) => {
    const { orden, detalles = [], diagnostico, reparacion } = datos;
    const doc = new jsPDF();

    // Paleta de colores profesional
    const primaryColor = [79, 70, 229]; // Indigo 600
    const textColor = [60, 60, 60];
    const headerBg = [245, 245, 250];

    // --- ENCABEZADO: LOGO Y EMPRESA ---
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("INGCOTEC", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont("helvetica", "normal");
    doc.text("Especialistas en Electrónica Automotriz", 14, 28);
    doc.text("Contacto: +58 412-1423182 | jjalvarezcalderon@gmail.com", 14, 33);

    // --- CAJA DE INFO DE LA ORDEN (Derecha) ---
    doc.setFillColor(...headerBg);
    doc.roundedRect(125, 12, 70, 26, 3, 3, 'F');

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`ORDEN #${String(orden.id).padStart(4, '0')}`, 130, 21);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    let fecha = '-';
    if (orden.created_at) {
        fecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(orden.created_at));
    }

    doc.text(`Fecha: ${fecha}`, 130, 28);
    doc.text(`Estado: ${orden.estado ? orden.estado.replace(/_/g, ' ') : ''}`, 130, 34);

    // Línea separadora
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 42, 196, 42);

    // --- SECCIÓN: DATOS DEL CLIENTE Y EQUIPO ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("DATOS DEL CLIENTE", 14, 50);
    doc.text("EQUIPO INGRESADO", 110, 50);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);

    // Cliente
    doc.text(`Nombre: ${orden.cliente_nombre || 'N/D'}`, 14, 56);
    doc.text(`Teléfono: ${orden.cliente_telefono || 'N/D'}`, 14, 61);
    doc.text(`Email: ${orden.cliente_email || 'N/D'}`, 14, 66);

    // Equipo
    if (orden.placa) {
        doc.text(`Vehículo: ${orden.marca || ''} ${orden.modelo || ''}`, 110, 56);
        doc.text(`Año: ${orden.anio || 'N/D'} | Placa: ${orden.placa}`, 110, 61);
        doc.text(`VIN: ${orden.vin || 'N/D'}`, 110, 66);
    } else {
        doc.text(`Módulo: ECU ${orden.tipo_modulo || ''}`, 110, 56);
        doc.text(`Marca/Modelo: ${orden.marca_modulo || ''} ${orden.modelo_modulo || ''}`, 110, 61);
        doc.text(`Serial: ${orden.serial_modulo || 'N/D'}`, 110, 66);
    }

    doc.setDrawColor(220, 220, 220);
    doc.line(14, 72, 196, 72);

    // --- SECCIÓN: BITÁCORA TÉCNICA RÁPIDA ---
    let startY = 80;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Motivo de Ingreso:", 14, startY);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textColor);
    const fallaLines = doc.splitTextToSize(orden.motivo_ingreso || 'Sin reporte', 180);
    doc.text(fallaLines, 14, startY + 5);

    startY += 8 + (fallaLines.length * 4);

    if (reparacion) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Trabajo Realizado:", 14, startY);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textColor);
        const repLines = doc.splitTextToSize(reparacion, 180);
        doc.text(repLines, 14, startY + 5);
        startY += 8 + (repLines.length * 4);
    }

    startY += 5; // Espacio extra antes de la tabla

    // --- TABLA DE COSTOS PROFESIONAL (LEYENDO 'orden_detalles') ---
    if (detalles && detalles.length > 0) {

        // Mapeamos los datos nuevos
        const tableData = detalles.map(d => [
            d.tipo_item ? d.tipo_item.replace(/_/g, ' ') : 'Mano de Obra',
            d.descripcion || 'Sin descripción',
            `${Number(d.cantidad || 1)}`,
            `$${Number(d.precio_unitario || 0).toFixed(2)}`,
            `$${(Number(d.precio_unitario || 0) * Number(d.cantidad || 1)).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: startY,
            head: [['Categoría', 'Descripción', 'Cant.', 'P. Unitario', 'Subtotal']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 4, textColor: [80, 80, 80] },
            columnStyles: {
                0: { cellWidth: 35 },
                2: { halign: 'center', cellWidth: 15 },
                3: { halign: 'right', cellWidth: 25 },
                4: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
            },
            margin: { left: 14, right: 14 }
        });

        startY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : startY + 20;
    } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("No se registraron ítems cobrables en esta orden.", 14, startY);
        startY += 10;
    }

    // --- TOTALES Y GARANTÍA ---

    // Bloque Izquierdo: Garantía
    if (orden.dias_garantia && orden.dias_garantia > 0) {
        doc.setFillColor(236, 253, 245); // Fondo verde muy claro
        doc.setDrawColor(16, 185, 129); // Borde verde esmeralda
        doc.roundedRect(14, startY - 3, 90, 16, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(6, 95, 70); // Texto verde oscuro
        doc.text("CERTIFICADO DE GARANTÍA", 18, startY + 3);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Válida por: ${orden.dias_garantia} días continuos.`, 18, startY + 9);
    } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150, 150, 150);
        doc.text("Esta reparación no cuenta con garantía extendida.", 14, startY + 5);
    }

    // Bloque Derecho: Total a Pagar
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL A PAGAR:", 125, startY + 5);

    // --- MAGIA MATEMÁTICA: Sumamos (Precio x Cantidad) de todos los ítems ---
    const totalCalculado = detalles && detalles.length > 0
        ? detalles.reduce((acc, item) => acc + (Number(item.precio_unitario || 0) * Number(item.cantidad || 1)), 0)
        : Number(orden.monto_presupuesto || 0);

    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    // Imprimimos el total exacto
    doc.text(`$${totalCalculado.toFixed(2)}`, 195, startY + 5, { align: 'right' });

    // --- PIE DE PÁGINA (LEGALES) ---
    const pageHeight = doc.internal.pageSize.height;

    doc.setDrawColor(220, 220, 220);
    doc.line(14, pageHeight - 25, 196, pageHeight - 25);

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Este documento es un comprobante de servicio técnico y no sustituye una factura fiscal.", 105, pageHeight - 18, { align: 'center' });
    doc.text("La garantía cubre exclusivamente la mano de obra y repuestos especificados en este documento, perdiendo su validez si el", 105, pageHeight - 13, { align: 'center' });
    doc.text("equipo es abierto o manipulado por terceros.", 105, pageHeight - 9, { align: 'center' });

    // Descargar el PDF
    doc.save(`INGCOTEC_ORD-${String(orden.id).padStart(4, '0')}_${(orden.cliente_nombre || 'Cliente').replace(/\s+/g, '_')}.pdf`);
};