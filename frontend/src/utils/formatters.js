export const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(value)
}

export const formatDateTime = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
};
