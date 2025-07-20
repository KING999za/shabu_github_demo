// Shabu POS Main Script - (DEMO VERSION v1.0)

$(document).ready(function () {
    // --- CONFIGURATION ---
    const PROMPTPAY_ID = '0979296288'; // Demo PromptPay ID
    const ADULT_PRICE = 300;
    const CHILD_PRICE = 150;

    // --- STATE MANAGEMENT (DEMO) ---
    let selectedTable = null;
    let currentBill = null;
    let activeTimers = {};
    let isActionInProgress = false;

    // --- MOCK DATABASE (DEMO) ---
    let mockDatabase = {
        zones: [
            { id: 1, name: 'โซน A (ริมหน้าต่าง)' },
            { id: 2, name: 'โซน B (ด้านใน)' },
            { id: 3, name: 'โซน C (ห้องแอร์)' }
        ],
        tables: [
            { id: 1, table_name: 'A1', zone_id: 1, status: 'available' },
            { id: 2, table_name: 'A2', zone_id: 1, status: 'available' },
            { id: 3, table_name: 'A3', zone_id: 1, status: 'occupied', bill_id: 101, adult_count: 2, child_count: 1, promotion_count: 0, start_time: new Date(Date.now() - 30 * 60000).toISOString(), notes: 'ขอเก้าอี้เด็ก', subtotal: 750, discount_percentage: 0, discount_amount: 0, total_amount: 750, customer_count: 3 },
            { id: 4, table_name: 'A4', zone_id: 1, status: 'available' },
            { id: 5, table_name: 'B1', zone_id: 2, status: 'available' },
            { id: 6, table_name: 'B2', zone_id: 2, status: 'available' },
            { id: 7, table_name: 'B3', zone_id: 2, status: 'occupied', bill_id: 102, adult_count: 4, child_count: 0, promotion_count: 0, start_time: new Date(Date.now() - 15 * 60000).toISOString(), notes: '', subtotal: 1200, discount_percentage: 10, discount_amount: 120, total_amount: 1080, customer_count: 4 },
            { id: 8, table_name: 'B4', zone_id: 2, status: 'available' },
            { id: 9, table_name: 'C1', zone_id: 3, status: 'available' },
            { id: 10, table_name: 'C2', zone_id: 3, status: 'available' },
        ],
        nextBillId: 103
    };

    // --- UI SELECTORS ---
    const ui = {
        tablesGridContainer: $('#tables-grid-container'),
        controlTableName: $('#control-table-name'),
        controlStartTime: $('#control-start-time'),
        controlCustomerCount: $('#control-customer-count'),
        billSummaryPanel: $('#bill-summary-panel'),
        notesDisplay: $('#notes-display'),
        btnEditNotes: $('#btn-edit-notes'),
        btnPayment: $('#btn-payment'),
        btnCheckBill: $('#btn-check-bill'),
        btnSplitBill: $('#btn-split-bill'),
        btnCancelBill: $('#btn-cancel-bill'),
        customerCountModal: new bootstrap.Modal($('#customer-count-modal')[0]),
        modalTableName: $('#modal-table-name'),
        modalAdultInput: $('#modal-adult-input'),
        modalChildInput: $('#modal-child-input'),
        modalPromoInput: $('#modal-promo-input'),
        modalStartTime: $('#modal-start-time'),
        modalDiscountPercentageInput: $('#discount-percentage'),
        modalSubtotalAmount: $('#modal-subtotal-amount'),
        modalDiscountAmount: $('#modal-discount-amount'),
        modalTotalAmount: $('#modal-total-amount'),
        paymentModal: new bootstrap.Modal($('#payment-modal')[0]),
        paymentModalTableName: $('#payment-modal-table-name'),
        paymentTotalAmount: $('#payment-total-amount'),
        qrCodeModal: new bootstrap.Modal($('#qr-code-modal')[0]),
        printReceiptModal: new bootstrap.Modal($('#print-receipt-modal')[0]),
        splitBillModal: new bootstrap.Modal($('#split-bill-modal')[0])
    };

    // --- DEMO API FUNCTIONS ---
    const demoApi = {
        getAllData: () => new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(mockDatabase))), 200)),
        openTable: (data) => new Promise(resolve => {
            const table = mockDatabase.tables.find(t => t.id === data.table_id);
            if (table && table.status === 'available') {
                const subtotal = (data.adult_count * ADULT_PRICE) + (data.child_count * CHILD_PRICE);
                const discountAmount = (subtotal * data.discount_percentage) / 100;
                const totalAmount = subtotal - discountAmount;

                Object.assign(table, {
                    status: 'occupied',
                    bill_id: mockDatabase.nextBillId++,
                    adult_count: data.adult_count,
                    child_count: data.child_count,
                    promotion_count: data.promo_count,
                    customer_count: data.adult_count + data.child_count + data.promo_count,
                    start_time: data.order_date,
                    notes: '',
                    subtotal: subtotal,
                    discount_percentage: discountPercentage,
                    discount_amount: discountAmount,
                    total_amount: totalAmount
                });
                resolve({ success: true, table: table, bill: table });
            } else {
                resolve({ success: false, message: 'Table is already occupied.' });
            }
        }),
        saveNote: (billId, note) => new Promise(resolve => {
            const table = mockDatabase.tables.find(t => t.bill_id === billId);
            if (table) {
                table.notes = note;
                resolve({ success: true, table: table, bill: table });
            }
        }),
        cancelBill: (billId) => new Promise(resolve => {
            const table = mockDatabase.tables.find(t => t.bill_id === billId);
            if (table) {
                Object.assign(table, {
                    status: 'available', bill_id: null, adult_count: 0, child_count: 0, promotion_count: 0,
                    customer_count: 0, start_time: null, notes: null, subtotal: 0, discount_percentage: 0,
                    discount_amount: 0, total_amount: 0
                });
                resolve({ success: true, table: table });
            }
        }),
        processPayment: (billId, paymentMethod) => new Promise(resolve => {
            // In demo, payment just clears the table like a cancellation
            const table = mockDatabase.tables.find(t => t.bill_id === billId);
            if (table) {
                 Object.assign(table, {
                    status: 'available', bill_id: null, adult_count: 0, child_count: 0, promotion_count: 0,
                    customer_count: 0, start_time: null, notes: null, subtotal: 0, discount_percentage: 0,
                    discount_amount: 0, total_amount: 0
                });
                resolve({ success: true, table: table });
            }
        })
    };

    // --- DYNAMIC UI & RENDERING (Mostly unchanged) ---

    function renderAllTables(data) {
        ui.tablesGridContainer.empty();
        Object.values(activeTimers).forEach(clearInterval);
        activeTimers = {};
        data.zones.forEach(zone => {
            const zoneContainer = $(`<div class="zone-container" id="zone-${zone.id}"><h5 class="zone-title">${zone.name}</h5><div class="tables-grid"></div></div>`);
            ui.tablesGridContainer.append(zoneContainer);
        });
        data.tables.forEach(table => {
            const tableBox = createTableElement(table);
            $(`#zone-${table.zone_id} .tables-grid`).append(tableBox);
        });
    }

    function createTableElement(table) {
        const tableBox = $(`<div class="table-box" data-table-id="${table.id}"></div>`);
        updateTableElement(tableBox, table);
        return tableBox;
    }

    function updateTableElement(element, tableData) {
        const customerCount = tableData.customer_count ? `<div class="table-customer-count">${tableData.customer_count} คน</div>` : '';
        const timeDiv = $(`<div class="table-time">-</div>`);
        
        element.removeClass('status-available status-occupied').addClass(`status-${tableData.status}`);
        element.html(`<div class="table-name">${tableData.table_name}</div>${customerCount}`).append(timeDiv);

        if (activeTimers[tableData.id]) {
            clearInterval(activeTimers[tableData.id]);
            delete activeTimers[tableData.id];
        }

        if (tableData.status === 'occupied' && tableData.start_time) {
            updateDuration(timeDiv, tableData.start_time);
            activeTimers[tableData.id] = setInterval(() => updateDuration(timeDiv, tableData.start_time), 1000);
        }
    }

    function updateControlPanel(details) {
        if (!details || !details.table) { return clearControlPanel(); }
        selectedTable = details.table;
        currentBill = details.bill;
        ui.controlTableName.text(selectedTable.table_name);
        const isOccupied = selectedTable.status === 'occupied';
        if (isOccupied && currentBill) {
            const totalCustomers = (parseInt(currentBill.adult_count, 10) || 0) + (parseInt(currentBill.child_count, 10) || 0) + (parseInt(currentBill.promotion_count, 10) || 0);
            ui.controlStartTime.text(formatTime(currentBill.start_time));
            ui.controlCustomerCount.text(totalCustomers);
            ui.notesDisplay.text(currentBill.notes || '-').html((i, html) => html.replace(/\n/g, '<br>'));
            
            let summaryHtml = `<div class="text-center mb-3"><h6 class="text-muted mb-1">เวลาเริ่ม</h6><p class="h5 fw-bold mb-0">${formatTime(currentBill.start_time)}</p></div>` +
                                  `<div class="d-flex justify-content-around align-items-center text-center">` +
                                  `<div class="summary-item mx-2"><h6 class="text-muted mb-1">ผู้ใหญ่</h6><p class="value text-primary mb-0">${currentBill.adult_count || 0}</p></div>` +
                                  `<div class="summary-item mx-2"><h6 class="text-muted mb-1">เด็ก</h6><p class="value text-info mb-0">${currentBill.child_count || 0}</p></div>` +
                                  `<div class="summary-item mx-2"><h6 class="text-muted mb-1">โปรโมชั่น</h6><p class="value text-warning mb-0">${currentBill.promotion_count || 0}</p></div>` +
                              `</div><hr>` +
                              `<div class="text-center mt-3"><h6 class="text-muted mb-1">ยอดรวม</h6><p class="h4 fw-bold mb-0">${parseFloat(currentBill.subtotal).toFixed(2)}</p></div>`;

            if (currentBill.discount_amount > 0) {
                summaryHtml += `<div class="text-center mt-2"><h6 class="text-muted mb-1">ส่วนลด (${currentBill.discount_percentage}%)</h6><p class="h5 fw-bold text-success mb-0">-${parseFloat(currentBill.discount_amount).toFixed(2)}</p></div>`;
            }

            summaryHtml += `<div class="text-center mt-3"><h6 class="text-muted mb-1">ยอดสุทธิ</h6><p class="display-4 text-danger fw-bold mb-0">${parseFloat(currentBill.total_amount).toFixed(2)}</p></div>`;

            ui.billSummaryPanel.html(summaryHtml);
            ui.btnPayment.add(ui.btnCheckBill).add(ui.btnSplitBill).add(ui.btnEditNotes).prop('disabled', false);
            ui.btnCancelBill.prop('disabled', userRole !== 'manager');
        } else {
            clearControlPanel();
        }
    }

    function clearControlPanel() {
        selectedTable = null;
        currentBill = null;
        $('.table-box.selected').removeClass('selected');
        ui.controlTableName.text('กรุณาเลือกโต๊ะ');
        ui.controlStartTime.text('--:--');
        ui.controlCustomerCount.text('-');
        ui.notesDisplay.text('-');
        ui.billSummaryPanel.html('<div class="text-center p-5 text-muted">โต๊ะนี้ว่าง</div>');
        $('.control-buttons button, .notes-section button').prop('disabled', true);
        if (userRole !== 'manager') ui.btnCancelBill.hide();
    }

    // --- EVENT HANDLERS (Modified for Demo) ---

    function handleTableClick() {
        if (isActionInProgress) return;
        const tableId = $(this).data('table-id');
        const tableData = mockDatabase.tables.find(t => t.id == tableId);
        if (!tableData) { return; }
        
        $('.table-box.selected').removeClass('selected');
        $(this).addClass('selected');
        
        const billData = (tableData.status === 'occupied') ? tableData : null;
        updateControlPanel({ table: tableData, bill: billData });

        if (tableData.status === 'available') {
            $('#customer-count-modal').data('table-id', tableData.id);
            ui.modalTableName.text(tableData.table_name);
            ui.modalAdultInput.val(1);
            ui.modalChildInput.val(0);
            ui.modalPromoInput.val(0);
            ui.modalDiscountPercentageInput.val(0);
            setModalTimeNow();
            calculateModalTotal();
            ui.customerCountModal.show();
        }
    }

    async function handleApiAction(apiCall, successCallback, failureMessage) {
        if (isActionInProgress) return;
        isActionInProgress = true;
        try {
            const result = await apiCall(); // Uses demoApi
            if (successCallback) {
                successCallback(result);
            } else if (result.success && result.table) {
                const tableId = result.table.id;
                const tableElement = $(`.table-box[data-table-id=${tableId}]`);
                updateTableElement(tableElement, result.table);
                if (selectedTable && selectedTable.id == tableId) {
                    updateControlPanel({table: result.table, bill: result.bill});
                }
            }
            return true;
        } catch (err) {
            alert(`${failureMessage}: ` + (err.message || 'An error occurred'));
            return false;
        } finally {
            isActionInProgress = false;
        }
    }

    async function handleConfirmOpenTable() {
        $('#confirm-open-table').blur();
        const adultCount = parseInt(ui.modalAdultInput.val(), 10) || 0;
        const childCount = parseInt(ui.modalChildInput.val(), 10) || 0;
        const promoCount = parseInt(ui.modalPromoInput.val(), 10) || 0;
        const discountPercentage = parseFloat(ui.modalDiscountPercentageInput.val()) || 0;
        const startTime = ui.modalStartTime.val();
        const tableId = $('#customer-count-modal').data('table-id');

        if ((adultCount + childCount + promoCount) > 0 && tableId) {
            ui.customerCountModal.hide();
            
            const openTableData = {
                action: 'open_table',
                table_id: tableId,
                adult_count: adultCount,
                child_count: childCount,
                promo_count: promoCount,
                discount_percentage: discountPercentage,
                order_date: startTime
            };

            await handleApiAction(
                () => demoApi.openTable(openTableData),
                (result) => {
                    if (result.success) {
                        const tableElement = $(`.table-box[data-table-id=${tableId}]`);
                        updateTableElement(tableElement, result.table);
                        updateControlPanel(result);
                    } else {
                        alert('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถเปิดโต๊ะได้'));
                    }
                },
                'ไม่สามารถเปิดโต๊ะได้'
            );
        } else {
            alert('กรุณาระบุจำนวนลูกค้าอย่างน้อย 1 คน');
        }
    }

    function calculateModalTotal() {
        const adultCount = parseInt(ui.modalAdultInput.val(), 10) || 0;
        const childCount = parseInt(ui.modalChildInput.val(), 10) || 0;
        const discountPercentage = parseFloat(ui.modalDiscountPercentageInput.val()) || 0;
        
        const subtotal = (adultCount * ADULT_PRICE) + (childCount * CHILD_PRICE);
        const discountAmount = (subtotal * discountPercentage) / 100;
        const total = subtotal - discountAmount;

        ui.modalSubtotalAmount.text(subtotal.toFixed(2));
        ui.modalDiscountAmount.text(discountAmount.toFixed(2));
        ui.modalTotalAmount.text(total.toFixed(2));
    }

    function setModalTimeNow() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        ui.modalStartTime.val(now.toISOString().slice(0,16));
    }

    async function handleEditNotes() {
        if (!currentBill || !currentBill.bill_id) return;
        const currentNote = currentBill.notes || "";
        const newNote = prompt("เพิ่ม/แก้ไขหมายเหตุ:", currentNote);
        if (newNote !== null) {
            await handleApiAction(() => demoApi.saveNote(currentBill.bill_id, newNote), null, 'ไม่สามารถบันทึกหมายเหตุได้');
        }
    }

    async function handleCancelBill() {
        if (userRole !== 'manager') return alert('เฉพาะผู้จัดการเท่านั้นที่สามารถยกเลิกบิลได้');
        if (!currentBill || !currentBill.bill_id || !confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิกโต๊ะ ${selectedTable.table_name}?`)) return;
        
        await handleApiAction(
            () => demoApi.cancelBill(currentBill.bill_id), 
            (result) => {
                if (result.success) {
                    const tableElement = $(`.table-box[data-table-id=${result.table.id}]`);
                    updateTableElement(tableElement, result.table);
                    alert(`ยกเลิกโต๊ะ ${selectedTable.table_name} เรียบร้อย`);
                    clearControlPanel();
                }
            }, 
            'การยกเลิกล้มเหลว'
        );
    }

    function handlePaymentClick() {
        if (!currentBill) return;
        ui.paymentModalTableName.text(selectedTable.table_name);
        ui.paymentTotalAmount.text(parseFloat(currentBill.total_amount).toFixed(2));
        ui.paymentModal.show();
    }

    async function handlePaymentMethod(e) {
        $(e.currentTarget).blur();
        const paymentMethod = $(e.currentTarget).data('method');
        if (paymentMethod === 'cash') {
            await confirmAndProcessPayment('cash');
        } else if (paymentMethod === 'qr_code') {
            generateAndShowQrCode();
        }
    }

    async function confirmAndProcessPayment(paymentMethod) {
        if (!currentBill || !currentBill.bill_id) return;
        await handleApiAction(
            () => demoApi.processPayment(currentBill.bill_id, paymentMethod),
            (result) => {
                if (result.success) {
                    ui.qrCodeModal.hide();
                    ui.paymentModal.hide();
                    alert(`ชำระเงินโต๊ะ ${selectedTable.table_name} สำเร็จ!`);
                    const tableElement = $(`.table-box[data-table-id=${result.table.id}]`);
                    updateTableElement(tableElement, result.table);
                    clearControlPanel();
                }
            },
            'การชำระเงินล้มเหลว'
        );
    }

    function generateAndShowQrCode() {
        const amount = parseFloat(currentBill.total_amount).toFixed(2);
        const qrData = generatePromptPayQR(PROMPTPAY_ID, amount);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
        $('#qr-modal-table-name').text(selectedTable.table_name);
        $('#qr-modal-amount').text(amount);
        $('#qr-code-image').attr('src', qrApiUrl);
        ui.paymentModal.hide();
        ui.qrCodeModal.show();
    }

    function handleCheckBill() {
        if (!currentBill) return;
        const totalCustomers = (parseInt(currentBill.adult_count, 10) || 0) + (parseInt(currentBill.child_count, 10) || 0) + (parseInt(currentBill.promotion_count, 10) || 0);
        $('#receipt-table-name').text(selectedTable.table_name);
        $('#receipt-time').text(new Date().toLocaleString('th-TH'));
        $('#receipt-customer-count').text(totalCustomers);
        let itemsHtml = '';
        if (currentBill.adult_count > 0) { itemsHtml += `<p>ผู้ใหญ่: ${currentBill.adult_count} x ${ADULT_PRICE.toFixed(2)} = ${(currentBill.adult_count * ADULT_PRICE).toFixed(2)}</p>`; }
        if (currentBill.child_count > 0) { itemsHtml += `<p>เด็ก: ${currentBill.child_count} x ${CHILD_PRICE.toFixed(2)} = ${(currentBill.child_count * CHILD_PRICE).toFixed(2)}</p>`; }
        if (currentBill.promotion_count > 0) { itemsHtml += `<p>โปรโมชั่น: ${currentBill.promotion_count}</p>`; }
        $('#receipt-items').html(itemsHtml);
        const discountText = currentBill.discount_percentage > 0 ? `(${currentBill.discount_percentage}%)` : '';
        let summaryHtml = `
            <div class="row mb-1"><div class="col">ยอดรวม:</div><div class="col text-end">${parseFloat(currentBill.subtotal).toFixed(2)} บาท</div></div>
            <div class="row mb-1 text-danger"><div class="col">ส่วนลด ${discountText}:</div><div class="col text-end">-${parseFloat(currentBill.discount_amount).toFixed(2)} บาท</div></div>
            <div class="row fw-bold mt-2 pt-2 border-top"><div class="col">ยอดสุทธิ:</div><div class="col text-end h5">${parseFloat(currentBill.total_amount).toFixed(2)} บาท</div></div>`;
        $('#receipt-summary').html(summaryHtml);
        ui.printReceiptModal.show();
    }

    function handleSplitBill() {
        if (!currentBill) return;
        $('#split-bill-table-name').text(selectedTable.table_name);
        $('#split-bill-total').text(parseFloat(currentBill.total_amount).toFixed(2));
        $('#split-count').val(2).trigger('input');
        ui.splitBillModal.show();
    }
    
    $('#split-count').on('input', function() {
        const total = parseFloat($('#split-bill-total').text());
        const count = parseInt($(this).val(), 10);
        if (total > 0 && count > 1) {
            $('#split-result').text((total / count).toFixed(2));
        } else {
            $('#split-result').text('0.00');
        }
    });

    function generatePromptPayQR(id, amount) {
        const ID_PROMPTPAY = '00'; const ID_MERCHANT_PHONE = '01'; const ID_MERCHANT_TAXID = '02'; const ID_TRANSACTION_CURRENCY = '53'; const ID_TRANSACTION_AMOUNT = '54'; const ID_COUNTRY_CODE = '58'; const ID_CRC = '63';
        const formatValue = (id, value) => id + String(value.length).padStart(2, '0') + value;
        const version = formatValue('00', '01'); const staticQR = formatValue('01', '11');
        let merchantInfo;
        if (id.length === 13) { merchantInfo = formatValue(ID_MERCHANT_TAXID, id); } else { const phone = id.replace(/[^0-9]/g, ''); const formattedPhone = `0066${phone.substring(1)}`; merchantInfo = formatValue(ID_MERCHANT_PHONE, formattedPhone); }
        const merchant = formatValue('29', merchantInfo); const country = formatValue(ID_COUNTRY_CODE, 'TH'); const currency = formatValue(ID_TRANSACTION_CURRENCY, '764'); const amountStr = formatValue(ID_TRANSACTION_AMOUNT, amount);
        const payload = `${version}${staticQR}${merchant}${country}${currency}${amountStr}${ID_CRC}04`;
        let crc = 0xFFFF;
        for (let i = 0; i < payload.length; i++) { crc ^= payload.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) { crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1; } } 
        crc &= 0xFFFF;
        return payload + crc.toString(16).toUpperCase().padStart(4, '0');
    }

    function formatTime(dateTimeString) { if (!dateTimeString) return '--:--'; return new Date(dateTimeString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }); }
    
    function updateDuration(element, startTime) {
        const start = new Date(startTime).getTime();
        if (isNaN(start)) { element.text('--:--:--'); return; }
        const now = new Date().getTime();
        const diff = now - start;
        if (diff < 0) { element.text('00:00:00'); return; }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        element.text(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }

    // --- INITIALIZATION ---
    async function initializeApp() {
        try {
            const data = await demoApi.getAllData();
            mockDatabase = data; // Store initial data
            renderAllTables(mockDatabase);
            clearControlPanel();
            if (userRole !== 'manager') ui.btnCancelBill.hide();
        } catch (err) {
            console.error("Initialization failed:", err);
            ui.tablesGridContainer.html('<div class="alert alert-danger m-3">ไม่สามารถโหลดเดโมได้</div>');
        }
    }

    // --- EVENT BINDING ---
    ui.tablesGridContainer.on('click', '.table-box', handleTableClick);
    $('#confirm-open-table').on('click', handleConfirmOpenTable);
    $('.customer-input').on('input', calculateModalTotal);
    ui.btnEditNotes.on('click', handleEditNotes);
    ui.btnCancelBill.on('click', handleCancelBill);
    ui.btnPayment.on('click', handlePaymentClick);
    $('.payment-method-btn').on('click', handlePaymentMethod);
    $('#btn-confirm-qr-payment').on('click', () => confirmAndProcessPayment('qr_code'));
    ui.btnCheckBill.on('click', handleCheckBill);
    ui.btnSplitBill.on('click', handleSplitBill);
    $('#btn-do-print').on('click', function() {
        const receiptContent = $('#receipt-content').html();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Print Receipt</title>`);
        printWindow.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">');
        printWindow.document.write('<style>body { padding: 20px; } @media print { .d-print-none { display: none !important; } }</style></head><body>');
        printWindow.document.write(receiptContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        setTimeout(() => { // Wait for content to load
            printWindow.print();
            printWindow.close();
        }, 250);
    });

    initializeApp();
});