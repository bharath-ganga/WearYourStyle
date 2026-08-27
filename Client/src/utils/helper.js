export function currencyFormat(num){
    const value = Number(num);
    return "₹ " + (Number.isFinite(value) ? value : 0).toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}
