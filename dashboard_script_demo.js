// Shabu POS Dashboard Script - (DEMO VERSION v1.0)

document.addEventListener('DOMContentLoaded', function() {

    // --- MOCK DATABASE (DEMO) ---
    const mockBills = generateMockBills(25); // Generate 25 mock bills

    // --- UI SELECTORS ---
    const ui = {
        dailyTotal: document.getElementById('daily-total'),
        monthlyTotal: document.getElementById('monthly-total'),
        monthlySalesChart: document.getElementById('monthly-sales-chart'),
        billsTableBody: document.getElementById('paid-bills-table-body'),
        btnToday: document.getElementById('btn-bills-today'),
        btnAll: document.getElementById('btn-bills-all'),
        searchInput: document.getElementById('bill-search-input'),
        searchButton: document.getElementById('btn-bill-search'),
        billDetailsModal: new bootstrap.Modal(document.getElementById('bill-details-modal')),
        billDetailsContent: document.getElementById('bill-details-content'),
        printBillButton: document.getElementById('btn-print-bill')
    };

    // --- STATE MANAGEMENT ---
    let currentFilter = 'today'; // 'today' or 'all'
    let currentSearchTerm = '';

    // --- DATA GENERATION (DEMO) ---
    function generateMockBills(count) {
        const bills = [];
        const today = new Date();
        const tableNames = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2'];
        for (let i = 0; i < count; i++) {
            const adults = Math.floor(Math.random() * 4) + 1;
            const children = Math.floor(Math.random() * 3);
            const subtotal = (adults * 300) + (children * 150);
            const discountPercentage = Math.random() < 0.2 ? 10 : 0;
            const discountAmount = (subtotal * discountPercentage) / 100;
            const totalAmount = subtotal - discountAmount;
            const paymentTime = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Within last 30 days

            bills.push({
                id: 2000 + i,
                table_name: tableNames[Math.floor(Math.random() * tableNames.length)],
                adult_count: adults,
                child_count: children,
                subtotal: subtotal,
                discount_percentage: discountPercentage,
                discount_amount: discountAmount,
                total_amount: totalAmount,
                payment_time: paymentTime.toISOString(),
                payment_method: Math.random() < 0.6 ? 'cash' : 'qr_code',
                order_date: new Date(paymentTime.getTime() - (Math.random() * 60 + 30) * 60000).toISOString()
            });
        }
        return bills.sort((a, b) => new Date(b.payment_time) - new Date(a.payment_time));
    }

    // --- DATA PROCESSING & RENDERING ---
    function calculateSummary() {
        const today = new Date().toDateString();
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();

        const dailyTotal = mockBills
            .filter(b => new Date(b.payment_time).toDateString() === today)
            .reduce((sum, b) => sum + b.total_amount, 0);

        const monthlyTotal = mockBills
            .filter(b => {
                const d = new Date(b.payment_time);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            })
            .reduce((sum, b) => sum + b.total_amount, 0);

        ui.dailyTotal.textContent = `${dailyTotal.toFixed(2)} บาท`;
        ui.monthlyTotal.textContent = `${monthlyTotal.toFixed(2)} บาท`;
    }

    function renderChart() {
        const labels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const monthlyData = new Array(12).fill(0);
        const thisYear = new Date().getFullYear();

        mockBills.forEach(b => {
            const d = new Date(b.payment_time);
            if (d.getFullYear() === thisYear) {
                monthlyData[d.getMonth()] += b.total_amount;
            }
        });

        const ctx = ui.monthlySalesChart.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `ยอดขายปี ${thisYear + 543}`,
                    data: monthlyData,
                    backgroundColor: 'rgba(0, 104, 255, 0.2)',
                    borderColor: 'rgba(0, 104, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
        });
    }

    function renderBills(billsToRender) {
        ui.billsTableBody.innerHTML = '';
        if (billsToRender.length === 0) {
            ui.billsTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">ไม่พบข้อมูลบิล</td></tr>';
            return;
        }
        let rows = '';
        billsToRender.forEach(bill => {
            const paymentTime = new Date(bill.payment_time);
            const formattedTime = paymentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            rows += `
                <tr>
                    <td class="ps-4 fw-bold">#${bill.id}</td>
                    <td>${bill.table_name}</td>
                    <td>${parseFloat(bill.total_amount).toFixed(2)}</td>
                    <td>${formattedTime}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-primary btn-view-details" data-bill-id="${bill.id}">
                            <i class="fas fa-eye me-1"></i>ดู
                        </button>
                    </td>
                </tr>
            `;
        });
        ui.billsTableBody.innerHTML = rows;
    }

    function fetchAndDisplayBills() {
        let filteredBills = mockBills;
        const todayStr = new Date().toDateString();

        if (currentSearchTerm) {
            filteredBills = mockBills.filter(b => String(b.id).includes(currentSearchTerm));
        } else if (currentFilter === 'today') {
            filteredBills = mockBills.filter(b => new Date(b.payment_time).toDateString() === todayStr);
        }

        renderBills(filteredBills);
    }

    // --- EVENT LISTENERS ---
    ui.searchButton.addEventListener('click', () => {
        currentSearchTerm = ui.searchInput.value.trim();
        fetchAndDisplayBills();
    });

    ui.searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') ui.searchButton.click(); });

    document.querySelectorAll('input[name="bill_filter"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentSearchTerm = '';
            ui.searchInput.value = '';
            currentFilter = this.id === 'btn-bills-today' ? 'today' : 'all';
            fetchAndDisplayBills();
        });
    });

    ui.billsTableBody.addEventListener('click', e => {
        const viewButton = e.target.closest('.btn-view-details');
        if (viewButton) {
            const billId = parseInt(viewButton.dataset.billId, 10);
            const bill = mockBills.find(b => b.id === billId);
            if (bill) showBillDetails(bill);
        }
    });

    function showBillDetails(bill) {
        const paymentMethodText = { 'cash': 'เงินสด', 'qr_code': 'QR Code' }[bill.payment_method] || 'ไม่ระบุ';
        const discountText = bill.discount_percentage > 0 ? `(${bill.discount_percentage}%)` : '';
        
        let itemsHtml = '';
        if(bill.adult_count > 0) itemsHtml += `<li class="list-group-item d-flex justify-content-between"><div>ผู้ใหญ่ x${bill.adult_count}</div><span>${(bill.adult_count * 300).toFixed(2)}</span></li>`;
        if(bill.child_count > 0) itemsHtml += `<li class="list-group-item d-flex justify-content-between"><div>เด็ก x${bill.child_count}</div><span>${(bill.child_count * 150).toFixed(2)}</span></li>`;

        ui.billDetailsContent.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="modal-title fw-bold">บิล #${bill.id}</h5>
                <span class="badge bg-secondary-light text-dark-emphasis">โต๊ะ ${bill.table_name}</span>
            </div>
            <p class="mb-2 text-muted">ชำระโดย: <strong>${paymentMethodText}</strong></p>
            <hr>
            <h6 class="fw-bold mb-2">รายการ</h6>
            <ul class="list-group list-group-flush mb-3">${itemsHtml}</ul>
            <div class="text-end">
                <div class="row mb-1"><div class="col">ยอดรวม:</div><div class="col text-end">${bill.subtotal.toFixed(2)} บาท</div></div>
                <div class="row mb-1 text-danger"><div class="col">ส่วนลด ${discountText}:</div><div class="col text-end">-${bill.discount_amount.toFixed(2)} บาท</div></div>
                <div class="row fw-bold mt-2 pt-2 border-top"><div class="col">ยอดสุทธิ:</div><div class="col text-end h5">${bill.total_amount.toFixed(2)} บาท</div></div>
            </div>
        `;
        ui.billDetailsModal.show();
    }

    // --- INITIAL LOAD ---
    calculateSummary();
    renderChart();
    fetchAndDisplayBills();
});
