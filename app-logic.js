(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.LojinhaLogic = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {

  function normalizeProductName(name) {
    return String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }




  function sortProductsByName(products) {
    return (products || []).slice().sort((a, b) => normalizeProductName(a.name).localeCompare(normalizeProductName(b.name), "pt-BR") || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }
  function categoryText(item) {
    return String(item?.category || item?.productCategory || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function isSupplyProduct(product) {
    const category = categoryText(product);
    return category.includes("insumo") || category.includes("material");
  }

  function filterSellableProducts(products) {
    return (products || []).filter(product => !isSupplyProduct(product));
  }

  function purchaseCategory(purchase, products) {
    if (purchase.category) return purchase.category;
    const product = (products || []).find(item => item.id === purchase.productId || item.name === purchase.productName);
    return product?.category || "";
  }

  function purchaseBreakdown(purchases, products, month) {
    const inPeriod = (purchases || []).filter(purchase => !month || (purchase.date && purchase.date.slice(0, 7) === month));
    let merchandiseTotal = 0;
    let suppliesTotal = 0;
    inPeriod.forEach(purchase => {
      const total = Number(purchase.quantity || 0) * Number(purchase.unitCost || 0);
      const category = purchaseCategory(purchase, products);
      if (isSupplyProduct({ category })) suppliesTotal += total;
      else merchandiseTotal += total;
    });
    return { merchandiseTotal, suppliesTotal, total: merchandiseTotal + suppliesTotal };
  }


  function purchaseDaySummary(purchases, products, date) {
    const dayPurchases = (purchases || []).filter(purchase => purchase.date === date);
    const totals = purchaseBreakdown(dayPurchases, products);
    return {
      ...totals,
      count: dayPurchases.length
    };
  }
  function productHistory(product, purchases, sales) {
    const productId = product?.id;
    const productPurchases = (purchases || []).filter(purchase => purchase.productId === productId || purchase.productName === product?.name);
    const productSales = (sales || []).filter(sale => sale.productId === productId || sale.productSnapshot?.name === product?.name);
    const purchaseDates = productPurchases.map(purchase => purchase.date).filter(Boolean).sort();
    const totalBoughtQuantity = sum(productPurchases, purchase => Number(purchase.quantity || 0));
    const totalPurchaseCost = sum(productPurchases, purchase => Number(purchase.quantity || 0) * Number(purchase.unitCost || 0));
    const soldQuantity = sum(productSales, sale => Number(sale.quantity || 0));
    const soldTotal = sum(productSales, sale => saleTotals(sale).revenue);
    const profitGenerated = sum(productSales, sale => saleTotals(sale).profit);
    return {
      firstPurchaseDate: purchaseDates[0] || "",
      lastPurchaseDate: purchaseDates[purchaseDates.length - 1] || "",
      purchaseCount: productPurchases.length,
      totalBoughtQuantity,
      totalPurchaseCost,
      averagePaid: totalBoughtQuantity ? totalPurchaseCost / totalBoughtQuantity : 0,
      soldQuantity,
      soldTotal,
      profitGenerated,
      stock: Number(product?.stock || 0)
    };
  }
  function filterProductsByCategory(products, category) {
    const normalizedCategory = normalizeProductName(category);
    if (!normalizedCategory) return (products || []).slice();
    return (products || []).filter(product => normalizeProductName(product.category) === normalizedCategory);
  }
  function filterProducts(products, query) {
    const normalizedQuery = normalizeProductName(query);
    if (!normalizedQuery) return products.slice();
    return products.filter(product => normalizeProductName(product.name).includes(normalizedQuery));
  }
  function hasDuplicateProductName(products, name, currentId) {
    const normalized = normalizeProductName(name);
    return products.some(product => product.id !== currentId && normalizeProductName(product.name) === normalized);
  }
  function saleTotals(sale) {
    const price = sale.unitPrice ?? sale.productSnapshot?.price ?? 0;
    const cost = sale.unitCost ?? sale.productSnapshot?.cost ?? 0;
    const quantity = Number(sale.quantity || 0);
    const gross = Number(price || 0) * quantity;
    const discount = Math.min(Math.max(Number(sale.discount || 0), 0), gross);
    const revenue = gross - discount;
    const recordedCost = Number(sale.totalCost);
    const totalCost = Number.isFinite(recordedCost) ? recordedCost : Number(cost || 0) * quantity;
    return {
      revenue,
      profit: revenue - totalCost
    };
  }


  function saleDisplayRows(sales) {
    const groups = new Map();
    (sales || []).forEach((sale, index) => {
      const groupId = sale.saleGroupId || "";
      const key = groupId ? `group:${groupId}` : `sale:${sale.id || index}`;
      if (!groups.has(key)) groups.set(key, { groupId, sales: [] });
      groups.get(key).sales.push(sale);
    });

    return Array.from(groups.values()).map(group => {
      const groupSales = group.sales;
      const first = groupSales[0] || {};
      const isGroup = Boolean(group.groupId && groupSales.length > 1);
      if (!isGroup) {
        const sale = first;
        return {
          id: sale.id,
          sale,
          sales: [sale],
          isGroup: false,
          saleGroupId: sale.saleGroupId || "",
          salesCount: 1,
          date: sale.date || "",
          customer: sale.customer || "Cliente",
          productName: sale.quickSale || (!sale.productId && !sale.productSnapshot?.name) ? "Venda por valor" : sale.productSnapshot?.name || "Produto",
          category: sale.productSnapshot?.category || "-",
          quantity: Number(sale.quantity || 0),
          total: saleTotals(sale).revenue,
          status: sale.status,
          paymentType: sale.paymentType
        };
      }

      return {
        id: `group:${group.groupId}`,
        sale: first,
        sales: groupSales,
        isGroup: true,
        saleGroupId: group.groupId,
        salesCount: groupSales.length,
        date: first.date || "",
        customer: first.customer || "Cliente",
        productName: `Carrinho (${groupSales.length} ${groupSales.length === 1 ? "item" : "itens"})`,
        category: "Venda com carrinho",
        quantity: sum(groupSales, sale => Number(sale.quantity || 0)),
        total: sum(groupSales, sale => saleTotals(sale).revenue),
        status: groupSales.some(sale => sale.status === "pending") ? "pending" : first.status,
        paymentType: first.paymentType
      };
    }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id || "").localeCompare(String(a.id || "")));
  }
  function sum(items, pick) {
    return items.reduce((total, item) => total + pick(item), 0);
  }


  function cartTotals(items, discount) {
    const gross = sum(items, item => Number(item.unitPrice ?? item.productSnapshot?.price ?? 0) * Number(item.quantity || 0));
    const cost = sum(items, item => Number(item.unitCost ?? item.productSnapshot?.cost ?? 0) * Number(item.quantity || 0));
    const safeDiscount = Math.min(Math.max(Number(discount || 0), 0), gross);
    const revenue = gross - safeDiscount;
    return {
      gross,
      revenue,
      profit: revenue - cost,
      discount: safeDiscount
    };
  }

  function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function quickSaleEstimate(products, value) {
    const revenue = roundMoney(Math.max(Number(value || 0), 0));
    const validProducts = filterSellableProducts(products || []).filter(product => Number(product.price || 0) > 0);
    const totalPrice = sum(validProducts, product => Number(product.price || 0));
    const totalProfit = sum(validProducts, product => Math.max(Number(product.price || 0) - Number(product.cost || 0), 0));
    const margin = totalPrice > 0 ? totalProfit / totalPrice : 0;
    const estimatedProfit = roundMoney(revenue * margin);
    const estimatedCost = roundMoney(revenue - estimatedProfit);
    return { revenue, estimatedCost, estimatedProfit, profitRate: Math.round(margin * 100) };
  }

  function stockConferencePlan(products, countedStockById) {
    const sold = [];
    const adjustments = [];
    (products || []).forEach(product => {
      if (!Object.prototype.hasOwnProperty.call(countedStockById || {}, product.id)) return;
      const previousStock = Number(product.stock || 0);
      const countedStock = Number(countedStockById[product.id] || 0);
      const difference = countedStock - previousStock;
      if (difference === 0) return;
      adjustments.push({ productId: product.id, productName: product.name, previousStock, countedStock, difference });
      if (difference < 0 && !isSupplyProduct(product)) {
        const quantitySold = Math.abs(difference);
        const unitCost = Number(product.cost || 0);
        const unitPrice = Number(product.price || 0);
        sold.push({
          productId: product.id,
          productName: product.name,
          category: product.category || "",
          previousStock,
          countedStock,
          quantitySold,
          unitCost,
          unitPrice,
          revenue: roundMoney(unitPrice * quantitySold),
          profit: roundMoney((unitPrice - unitCost) * quantitySold)
        });
      }
    });
    return { sold, adjustments };
  }
  function profitPercent(cost, price) {
    const paid = Number(cost || 0);
    const sale = Number(price || 0);
    if (paid <= 0) return 0;
    return ((sale - paid) / paid) * 100;
  }
  function sameMonth(date, referenceDate) {
    return date.slice(0, 7) === referenceDate.slice(0, 7);
  }

  function monthStats(sales, referenceDate) {
    const monthSales = sales.filter(sale => sameMonth(sale.date, referenceDate));
    return {
      salesCount: monthSales.length,
      soldTotal: sum(monthSales, sale => saleTotals(sale).revenue),
      profit: sum(monthSales, sale => saleTotals(sale).profit),
      pendingTotal: sum(sales.filter(sale => sale.status === "pending"), sale => saleTotals(sale).revenue)
    };
  }

  function closingStats(sales, date) {
    const salesOnDate = sales.filter(sale => sale.date === date);
    const paidOnDate = sales.filter(sale => {
      if (sale.status === "paid") return sale.date === date;
      if (sale.status === "paid-later") return sale.paidDate === date;
      return false;
    });
    const pendingFromDate = salesOnDate.filter(sale => sale.status === "pending");
    return {
      salesCount: salesOnDate.length,
      soldTotal: sum(salesOnDate, sale => saleTotals(sale).revenue),
      receivedTotal: sum(paidOnDate, sale => saleTotals(sale).revenue),
      pendingTotal: sum(pendingFromDate, sale => saleTotals(sale).revenue),
      estimatedProfit: sum(salesOnDate, sale => saleTotals(sale).profit)
    };
  }


  function monthlyClosingStats(sales, month) {
    const salesInMonth = sales.filter(sale => sale.date.slice(0, 7) === month);
    const paidInMonth = sales.filter(sale => {
      if (sale.status === "paid") return sale.date.slice(0, 7) === month;
      if (sale.status === "paid-later" && sale.paidDate) return sale.paidDate.slice(0, 7) === month;
      return false;
    });
    const pendingFromMonth = salesInMonth.filter(sale => sale.status === "pending");
    return {
      salesCount: salesInMonth.length,
      soldTotal: sum(salesInMonth, sale => saleTotals(sale).revenue),
      receivedTotal: sum(paidInMonth, sale => saleTotals(sale).revenue),
      pendingTotal: sum(pendingFromMonth, sale => saleTotals(sale).revenue),
      estimatedProfit: sum(salesInMonth, sale => saleTotals(sale).profit)
    };
  }

  function purchasesInPeriod(purchases, period, mode) {
    return (purchases || []).filter(purchase => {
      if (!purchase.date) return false;
      return mode === "month" ? purchase.date.slice(0, 7) === period : purchase.date === period;
    });
  }

  function closingConference(sales, purchases, products, period, mode) {
    const stats = mode === "month" ? monthlyClosingStats(sales || [], period) : closingStats(sales || [], period);
    const purchaseTotals = purchaseBreakdown(purchasesInPeriod(purchases, period, mode), products || []);
    return {
      ...stats,
      spentTotal: purchaseTotals.total,
      merchandiseSpent: purchaseTotals.merchandiseTotal,
      suppliesSpent: purchaseTotals.suppliesTotal,
      estimatedBalance: stats.receivedTotal - purchaseTotals.total
    };
  }

  function closingWhatsAppText(conference, periodLabel) {
    return [
      `Fechamento da Lojinha da Jô - ${periodLabel}`,
      `Vendas registradas: ${Number(conference.salesCount || 0)}`,
      `Entrou no dinheiro/pix: ${formatMoneyBR(conference.receivedTotal)}`,
      `Ficou pendente: ${formatMoneyBR(conference.pendingTotal)}`,
      `Foi gasto em compras: ${formatMoneyBR(conference.spentTotal)}`,
      `Saldo estimado: ${formatMoneyBR(conference.estimatedBalance)}`,
      `Lucro estimado: ${formatMoneyBR(conference.estimatedProfit)}`
    ].join("\n");
  }
  function profitGoalProgress(sales, referenceDate, goal = 500) {
    const [yearText, monthText, dayText] = String(referenceDate).split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText || 1);
    const lastDay = new Date(year, month, 0).getDate();
    const startDay = day <= 15 ? 1 : 16;
    const endDay = day <= 15 ? 15 : lastDay;
    const start = `${yearText}-${monthText}-${String(startDay).padStart(2, "0")}`;
    const end = `${yearText}-${monthText}-${String(endDay).padStart(2, "0")}`;
    const profit = sum((sales || []).filter(sale => sale.date >= start && sale.date <= end), sale => saleTotals(sale).profit);
    const remaining = Math.max(goal - profit, 0);
    const percent = goal > 0 ? Math.min((profit / goal) * 100, 100) : 100;
    const stage = percent >= 100 ? "super" : percent >= 75 ? "happy" : percent >= 50 ? "hopeful" : percent >= 25 ? "calm" : "sad";
    return { start, end, goal, profit, remaining, percent, stage };
  }
  function previousMonth(month) {
    const [yearText, monthText] = String(month).split("-");
    const date = new Date(Number(yearText), Number(monthText) - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthComparison(sales, month) {
    const current = monthlyClosingStats(sales, month);
    const previous = monthlyClosingStats(sales, previousMonth(month));
    const percent = (currentValue, previousValue) => previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
    return {
      revenueDiff: current.soldTotal - previous.soldTotal,
      revenuePercent: percent(current.soldTotal, previous.soldTotal),
      profitDiff: current.estimatedProfit - previous.estimatedProfit,
      profitPercent: percent(current.estimatedProfit, previous.estimatedProfit),
      current,
      previous
    };
  }
  function monthHighlights(sales, products, month) {
    const salesInMonth = sales.filter(sale => sale.date && sale.date.slice(0, 7) === month);
    const soldByProduct = new Map();

    salesInMonth.forEach(sale => {
      const productId = sale.productId || sale.productSnapshot?.name || "produto";
      const current = soldByProduct.get(productId) || {
        name: sale.productSnapshot?.name || "Produto",
        quantity: 0,
        total: 0,
        profit: 0
      };
      const totals = saleTotals(sale);
      current.quantity += Number(sale.quantity || 0);
      current.total += totals.revenue;
      current.profit += totals.profit;
      soldByProduct.set(productId, current);
    });

    const soldItems = Array.from(soldByProduct.values());
    const topSelling = soldItems
      .slice()
      .sort((a, b) => b.quantity - a.quantity || b.total - a.total || a.name.localeCompare(b.name))[0] || null;
    const topProfit = soldItems
      .slice()
      .sort((a, b) => b.profit - a.profit || b.quantity - a.quantity || a.name.localeCompare(b.name))[0] || null;
    const idleStock = products
      .filter(product => Number(product.stock || 0) > 0 && !soldByProduct.has(product.id))
      .map(product => ({
        name: product.name,
        stock: Number(product.stock || 0),
        stockValue: Number(product.stock || 0) * Number(product.cost || 0)
      }))
      .sort((a, b) => b.stockValue - a.stockValue || b.stock - a.stock || a.name.localeCompare(b.name))[0] || null;

    return {
      topSelling: topSelling ? { name: topSelling.name, quantity: topSelling.quantity, total: topSelling.total } : null,
      topProfit: topProfit ? { name: topProfit.name, profit: topProfit.profit, quantity: topProfit.quantity } : null,
      idleStock
    };
  }

  function monthlyBusinessSummary(sales, purchases, month, products) {
    const closing = monthlyClosingStats(sales, month);
    const purchaseTotals = purchaseBreakdown(purchases, products, month);
    const purchasesTotal = purchaseTotals.merchandiseTotal;
    const debtorMap = new Map();

    sales
      .filter(sale => sale.status === "pending" && sale.date && sale.date.slice(0, 7) === month)
      .forEach(sale => {
        const customer = sale.customer || "Cliente";
        const current = debtorMap.get(customer) || { customer, total: 0, salesCount: 0, nextDueDate: sale.dueDate || "" };
        current.total += saleTotals(sale).revenue;
        current.salesCount += 1;
        if (sale.dueDate && (!current.nextDueDate || sale.dueDate < current.nextDueDate)) current.nextDueDate = sale.dueDate;
        debtorMap.set(customer, current);
      });

    return {
      ...closing,
      purchasesTotal,
      suppliesTotal: purchaseTotals.suppliesTotal,
      totalPurchases: purchaseTotals.total,
      finalEstimatedProfit: closing.estimatedProfit - purchaseTotals.suppliesTotal,
      estimatedBalance: closing.receivedTotal - purchaseTotals.total,
      debtors: Array.from(debtorMap.values()).sort((a, b) => b.total - a.total || a.customer.localeCompare(b.customer))
    };
  }
  function addCustomerTotal(map, customer, sale, extra) {
    const name = String(customer || "").trim();
    if (!name) return;
    const current = map.get(name) || { customer: name, total: 0, salesCount: 0, nextDueDate: "" };
    current.total += saleTotals(sale).revenue;
    current.salesCount += 1;
    if (extra?.dueDate && (!current.nextDueDate || extra.dueDate < current.nextDueDate)) current.nextDueDate = extra.dueDate;
    map.set(name, current);
  }

  function bestCustomer(map, includeDueDate) {
    const best = Array.from(map.values()).sort((a, b) => b.total - a.total || b.salesCount - a.salesCount || a.customer.localeCompare(b.customer))[0] || null;
    if (!best) return null;
    const result = { customer: best.customer, total: best.total, salesCount: best.salesCount };
    if (includeDueDate) result.nextDueDate = best.nextDueDate;
    return result;
  }

  function weekRange(referenceDate) {
    const date = new Date(`${referenceDate}T00:00:00`);
    const day = date.getDay() || 7;
    const start = new Date(date);
    start.setDate(date.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  }

  function customerRankings(sales, referenceDate) {
    const month = referenceDate.slice(0, 7);
    const week = weekRange(referenceDate);
    const monthMap = new Map();
    const weekMap = new Map();
    const debtorMap = new Map();
    const onTimeMap = new Map();

    sales.forEach(sale => {
      const customer = sale.customer;
      if (!String(customer || "").trim()) return;
      if (sale.date && sale.date.slice(0, 7) === month) addCustomerTotal(monthMap, customer, sale);
      if (sale.date && sale.date >= week.start && sale.date <= week.end) addCustomerTotal(weekMap, customer, sale);
      if (sale.status === "pending") addCustomerTotal(debtorMap, customer, sale, { dueDate: sale.dueDate || "" });
      if (sale.status === "paid-later" && sale.dueDate && sale.paidDate && sale.paidDate <= sale.dueDate) {
        addCustomerTotal(onTimeMap, customer, sale);
      }
    });

    return {
      monthVip: bestCustomer(monthMap, false),
      weekBuyer: bestCustomer(weekMap, false),
      topDebtor: bestCustomer(debtorMap, true),
      onTimePayer: bestCustomer(onTimeMap, false)
    };
  }
  function seasonalThemeInfo(date) {
    const [, monthText, dayText] = String(date || "").split("-");
    const month = Number(monthText || 0);
    const day = Number(dayText || 0);
    if (month === 6) return { season: "june", message: "Festa junina na Lojinha da Jô" };
    if (month === 7 && day === 25) return { season: "birthday-day", message: "Feliz aniversário, mãe!!!" };
    if (month === 7) return { season: "birthday", message: "Mês de aniversário da Jô" };
    if (month === 10) return { season: "halloween", message: "Outubro especial da Lojinha" };
    if (month === 12) return { season: "christmas", message: "Natal da Lojinha da Jô" };
    return { season: "normal", message: "" };
  }
  function formatMoneyBR(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
  }

  function formatDateBR(date) {
    if (!date) return "-";
    const [year, month, day] = String(date).split("-");
    return `${day}/${month}/${year}`;
  }

  function formatDateShortBR(date) {
    if (!date) return "-";
    const [, month, day] = String(date).split("-");
    return `${day}/${month}`;
  }


  function batchRemaining(batch) {
    return Number(batch.remaining ?? batch.quantity ?? 0);
  }

  function batchSortKey(batch) {
    return `${batch.date || "0000-00-00"}|${batch.createdAt || ""}|${batch.id || ""}`;
  }

  function normalizeBatch(batch, fallbackCost) {
    const quantity = Number(batch.quantity ?? batch.remaining ?? 0);
    const remaining = Math.max(0, Number(batch.remaining ?? quantity ?? 0));
    const unitCost = Number(batch.unitCost ?? fallbackCost ?? 0);
    return {
      ...batch,
      quantity,
      remaining,
      unitCost,
      totalCost: roundMoney(remaining * unitCost)
    };
  }

  function ensureInventoryBatches(product) {
    if (!product) return [];
    const stock = Math.max(0, Number(product.stock || 0));
    const fallbackCost = Number(product.cost || 0);
    product.batches = Array.isArray(product.batches)
      ? product.batches.map(batch => normalizeBatch(batch, fallbackCost)).filter(batch => batch.quantity > 0 || batch.remaining > 0)
      : [];
    const remaining = sum(product.batches, batch => batchRemaining(batch));
    if (stock > 0 && remaining <= 0) {
      product.batches.push({
        id: `initial-${product.id || normalizeProductName(product.name) || "product"}`,
        source: "initial",
        date: product.createdAtDate || product.createdAt || "",
        quantity: stock,
        remaining: stock,
        unitCost: fallbackCost,
        totalCost: roundMoney(stock * fallbackCost)
      });
    }
    product.batches.sort((a, b) => batchSortKey(a).localeCompare(batchSortKey(b)));
    recalculateProductCost(product);
    return product.batches;
  }

  function recalculateProductCost(product) {
    if (!product || !Array.isArray(product.batches)) return Number(product?.cost || 0);
    const remaining = sum(product.batches, batch => batchRemaining(batch));
    if (remaining <= 0) return Number(product.cost || 0);
    const totalCost = sum(product.batches, batch => batchRemaining(batch) * Number(batch.unitCost || 0));
    product.cost = roundMoney(totalCost / remaining);
    return product.cost;
  }

  function addPurchaseToInventory(product, purchase) {
    if (!product || !purchase) return null;
    ensureInventoryBatches(product);
    const quantity = Math.max(0, Number(purchase.quantity || 0));
    const unitCost = Math.max(0, Number(purchase.unitCost || 0));
    const batchId = purchase.batchId || purchase.id || `purchase-${Date.now()}`;
    purchase.batchId = batchId;
    product.batches.push({
      id: batchId,
      purchaseId: purchase.id || "",
      source: "purchase",
      date: purchase.date || "",
      quantity,
      remaining: quantity,
      unitCost,
      totalCost: roundMoney(quantity * unitCost),
      note: purchase.note || ""
    });
    product.stock = Math.max(0, Number(product.stock || 0)) + quantity;
    ensureInventoryBatches(product);
    return product.batches[product.batches.length - 1] || null;
  }


  function removePurchaseFromInventory(product, purchase) {
    if (!product || !purchase) return { ok: false, reason: "Produto ou compra não encontrado." };
    ensureInventoryBatches(product);
    const quantity = Math.max(0, Number(purchase.quantity || 0));
    const batchId = purchase.batchId || purchase.id || "";
    if (batchId) {
      const index = product.batches.findIndex(batch => batch.id === batchId || batch.purchaseId === purchase.id);
      if (index >= 0) {
        const batch = product.batches[index];
        const remaining = batchRemaining(batch);
        if (remaining < quantity) return { ok: false, reason: "Parte dessa compra já foi vendida. Não dá para excluir sem bagunçar o estoque." };
        batch.remaining = roundMoney(remaining - quantity);
        batch.quantity = Math.max(0, Number(batch.quantity || 0) - quantity);
        batch.totalCost = roundMoney(batch.remaining * Number(batch.unitCost || 0));
        product.stock = Math.max(0, Number(product.stock || 0) - quantity);
        if (batch.remaining <= 0 && batch.quantity <= 0) product.batches.splice(index, 1);
        ensureInventoryBatches(product);
        return { ok: true };
      }
    }
    if (Number(product.stock || 0) < quantity) return { ok: false, reason: "O estoque atual é menor que essa compra. Provavelmente parte dela já foi vendida." };
    setProductStockWithAdjustment(product, Number(product.stock || 0) - quantity, purchase.unitCost, purchase.date);
    return { ok: true };
  }
  function setProductStockWithAdjustment(product, desiredStock, unitCost, date) {
    if (!product) return;
    ensureInventoryBatches(product);
    const desired = Math.max(0, Number(desiredStock || 0));
    const current = Math.max(0, Number(product.stock || 0));
    const difference = desired - current;
    if (difference > 0) {
      product.batches.push({
        id: `adjustment-${product.id || normalizeProductName(product.name) || "product"}-${Date.now()}`,
        source: "manual-adjustment",
        date: date || "",
        quantity: difference,
        remaining: difference,
        unitCost: Math.max(0, Number(unitCost ?? product.cost ?? 0)),
        totalCost: roundMoney(difference * Math.max(0, Number(unitCost ?? product.cost ?? 0)))
      });
      product.stock = desired;
    } else if (difference < 0) {
      let toRemove = Math.abs(difference);
      product.batches.sort((a, b) => batchSortKey(a).localeCompare(batchSortKey(b)));
      product.batches.forEach(batch => {
        if (toRemove <= 0) return;
        const take = Math.min(batchRemaining(batch), toRemove);
        batch.remaining = roundMoney(batchRemaining(batch) - take);
        batch.totalCost = roundMoney(batch.remaining * Number(batch.unitCost || 0));
        toRemove -= take;
      });
      product.stock = desired;
    }
    ensureInventoryBatches(product);
  }

  function consumeProductInventory(product, sale) {
    if (!product || !sale || !sale.productId) return;
    ensureInventoryBatches(product);
    let remaining = Math.max(0, Number(sale.quantity || 0));
    const layers = [];
    product.batches.sort((a, b) => batchSortKey(a).localeCompare(batchSortKey(b)));
    product.batches.forEach(batch => {
      if (remaining <= 0) return;
      const available = batchRemaining(batch);
      if (available <= 0) return;
      const quantity = Math.min(available, remaining);
      const unitCost = Number(batch.unitCost || 0);
      batch.remaining = roundMoney(available - quantity);
      batch.totalCost = roundMoney(batch.remaining * unitCost);
      layers.push({ batchId: batch.id || "", quantity, unitCost, totalCost: roundMoney(quantity * unitCost) });
      remaining -= quantity;
    });
    if (remaining > 0) {
      const unitCost = Number(product.cost || sale.unitCost || sale.productSnapshot?.cost || 0);
      layers.push({ batchId: "fallback", quantity: remaining, unitCost, totalCost: roundMoney(remaining * unitCost) });
    }
    const quantity = Math.max(0, Number(sale.quantity || 0));
    const totalCost = roundMoney(sum(layers, layer => Number(layer.totalCost || 0)));
    sale.costLayers = layers;
    sale.totalCost = totalCost;
    sale.unitCost = quantity > 0 ? totalCost / quantity : 0;
    if (sale.productSnapshot) sale.productSnapshot.cost = sale.unitCost;
    product.stock = Math.max(0, Number(product.stock || 0) - quantity);
    ensureInventoryBatches(product);
  }

  function restoreProductInventory(product, sale) {
    if (!product || !sale || !sale.productId) return;
    ensureInventoryBatches(product);
    const quantity = Math.max(0, Number(sale.quantity || 0));
    product.stock = Math.max(0, Number(product.stock || 0)) + quantity;
    const layers = Array.isArray(sale.costLayers) && sale.costLayers.length ? sale.costLayers : null;
    if (layers) {
      layers.forEach(layer => {
        const layerQuantity = Math.max(0, Number(layer.quantity || 0));
        if (layerQuantity <= 0) return;
        const batch = product.batches.find(item => item.id === layer.batchId);
        if (batch) {
          batch.remaining = roundMoney(batchRemaining(batch) + layerQuantity);
          batch.quantity = Math.max(Number(batch.quantity || 0), batch.remaining);
          batch.totalCost = roundMoney(batch.remaining * Number(batch.unitCost || layer.unitCost || 0));
        } else {
          const unitCost = Number(layer.unitCost ?? sale.unitCost ?? sale.productSnapshot?.cost ?? 0);
          product.batches.push({
            id: `restored-${sale.id || Date.now()}-${product.batches.length}`,
            source: "sale-restore",
            date: sale.date || "",
            quantity: layerQuantity,
            remaining: layerQuantity,
            unitCost,
            totalCost: roundMoney(layerQuantity * unitCost)
          });
        }
      });
    } else {
      const unitCost = Number(sale.unitCost ?? sale.productSnapshot?.cost ?? product.cost ?? 0);
      product.batches.push({
        id: `restored-${sale.id || Date.now()}`,
        source: "sale-restore",
        date: sale.date || "",
        quantity,
        remaining: quantity,
        unitCost,
        totalCost: roundMoney(quantity * unitCost)
      });
    }
    ensureInventoryBatches(product);
  }
  function salePaymentText(sale) {
    if (sale.status === "pending") {
      if (sale.paymentType === "voucher-payday") return "Vale pagamento";
      return sale.paymentType === "voucher" ? "Vale" : "Pagamento";
    }
    if (sale.paymentType === "voucher-payday") return "Vale pagamento recebido";
    if (sale.paymentType === "voucher") return "Vale recebido";
    if (sale.paymentType === "payday") return "Pagamento recebido";
    return "Pago na hora";
  }

  function saleReceiptText(sale) {
    const totals = saleTotals(sale);
    const lines = [
      "Venda registrada com sucesso",
      `Cliente: ${sale.customer || "Cliente"}`,
      `Produto: ${sale.productSnapshot?.name || "Produto"}`,
      `Quantidade: ${Number(sale.quantity || 0)}`,
      `Total: ${formatMoneyBR(totals.revenue)}`,
      `Pagamento: ${salePaymentText(sale)}`
    ];
    if (sale.status === "pending") lines.push(`Prazo: ${formatDateBR(sale.dueDate)}`);
    return lines.join("\n");
  }
  function debtReminderText(sale) {
    const totals = saleTotals(sale);
    return `Oi, tudo bem? Passando para lembrar que ficou um valor pendente de ${formatMoneyBR(totals.revenue)} da compra do dia ${formatDateShortBR(sale.date || sale.dueDate)} na Lojinha da Jô.`;
  }

  function applySaleStockChange(products, oldSale, newSale) {
    if (oldSale) {
      const oldProduct = (products || []).find(product => product.id === oldSale.productId);
      if (oldProduct) restoreProductInventory(oldProduct, oldSale);
    }
    if (newSale) {
      const newProduct = (products || []).find(product => product.id === newSale.productId);
      if (newProduct) consumeProductInventory(newProduct, newSale);
    }
  }
  function shoppingList(products) {
    return products
      .filter(product => Number(product.stock) <= Number(product.minStock))
      .sort((a, b) => normalizeProductName(a.name).localeCompare(normalizeProductName(b.name), "pt-BR") || String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"))
      .map(product => ({
        id: product.id,
        name: product.name,
        stock: Number(product.stock),
        minStock: Number(product.minStock),
        suggestedQuantity: Math.max(Number(product.minStock) * 2 - Number(product.stock), 1),
        cost: Number(product.cost)
      }));
  }

  function stateLastModified(data) {
    const dates = [];
    [data?.products, data?.sales, data?.purchases, data?.trash].forEach(list => {
      if (!Array.isArray(list)) return;
      list.forEach(item => {
        if (item?.updatedAt) dates.push(item.updatedAt);
        if (item?.createdAt) dates.push(item.createdAt);
        if (item?.deletedAt) dates.push(item.deletedAt);
        if (item?.date) dates.push(item.date);
      });
    });
    if (data?.lastBackupAt) dates.push(data.lastBackupAt);
    return dates.reduce((latest, value) => {
      const time = new Date(value).getTime();
      return Number.isFinite(time) ? Math.max(latest, time) : latest;
    }, 0);
  }

  function syncStatusInfo(message, online = true) {
    const raw = String(message || "");
    if (!online) {
      return {
        text: "Sem internet: não feche ainda",
        level: "offline",
        warning: "Sem internet: não feche ainda. Faça backup se precisar continuar usando."
      };
    }
    if (/salvando/i.test(raw)) {
      return {
        text: "Salvando...",
        level: "saving",
        warning: "Salvando agora. Aguarde antes de fechar o app."
      };
    }
    if (/erro|falhou|desligado|local|publique|login/i.test(raw)) {
      return {
        text: "Erro: faça backup antes de continuar",
        level: "error",
        warning: "Erro: faça backup antes de continuar. Confira a internet e não feche o app até resolver."
      };
    }
    return {
      text: "Sincronizado",
      level: "ok",
      warning: ""
    };
  }

  function formatDateTimeBR(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "";
    return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function cloudSyncPanel({ online = true, cloudReady = false, lastSyncAt = "" } = {}) {
    return {
      internet: online ? "Internet ok" : "Sem internet",
      cloud: cloudReady ? "Nuvem ok" : "Nuvem aguardando",
      lastSync: lastSyncAt ? `Última sincronização: ${formatDateTimeBR(lastSyncAt)}` : "Última sincronização: ainda não sincronizou"
    };
  }

  function cloudSyncMode(config, protocol = "https:") {
    const url = String(config?.url || "");
    const anonKey = String(config?.anonKey || "");
    if (!url || !anonKey || url.includes("COLOQUE") || anonKey.includes("COLOQUE")) return "local";
    if (protocol === "file:") return "publish";
    return "direct";
  }

  function bulkDeleteSummary(data = {}) {
    return {
      products: Array.isArray(data.products) ? data.products.length : 0,
      sales: Array.isArray(data.sales) ? data.sales.length : 0,
      purchases: Array.isArray(data.purchases) ? data.purchases.length : 0
    };
  }

  function shouldProtectAgainstCloudConflict(localData, incomingData, toleranceMs = 1000) {
    return stateLastModified(localData) > stateLastModified(incomingData) + toleranceMs;
  }

  function createTrashEntry(type, item, reason, nowIso) {
    return {
      id: `trash-${type}-${item?.id || Date.now()}`,
      type,
      reason: reason || "Item apagado",
      deletedAt: nowIso || new Date().toISOString(),
      item: JSON.parse(JSON.stringify(item || {}))
    };
  }

  function backupReminder(lastBackupAt, nowIso, thresholdDays = 7) {
    if (!lastBackupAt) {
      return {
        shouldWarn: true,
        daysSinceBackup: null,
        message: "Nenhum backup baixado ainda. Faça um backup agora para guardar os dados."
      };
    }
    const last = new Date(lastBackupAt).getTime();
    const now = new Date(nowIso || new Date().toISOString()).getTime();
    if (!Number.isFinite(last) || !Number.isFinite(now)) return { shouldWarn: false, daysSinceBackup: 0, message: "" };
    const daysSinceBackup = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    const shouldWarn = daysSinceBackup >= thresholdDays;
    return {
      shouldWarn,
      daysSinceBackup,
      message: shouldWarn ? `Faz ${daysSinceBackup} dias que o backup não é baixado. Faça um backup agora para guardar os dados.` : ""
    };
  }
  return { saleTotals, saleDisplayRows, productHistory, normalizeProductName, sortProductsByName, filterProducts, filterProductsByCategory, filterSellableProducts, isSupplyProduct, purchaseBreakdown, purchaseDaySummary, cartTotals, quickSaleEstimate, stockConferencePlan, hasDuplicateProductName, profitPercent, profitGoalProgress, monthStats, monthComparison, monthHighlights, customerRankings, closingStats, closingConference, closingWhatsAppText, backupReminder, cloudSyncPanel, cloudSyncMode, createTrashEntry, bulkDeleteSummary, monthlyClosingStats, monthlyBusinessSummary, seasonalThemeInfo, saleReceiptText, debtReminderText, addPurchaseToInventory, removePurchaseFromInventory, setProductStockWithAdjustment, ensureInventoryBatches, applySaleStockChange, shouldProtectAgainstCloudConflict, shoppingList, stateLastModified, syncStatusInfo };
});




























