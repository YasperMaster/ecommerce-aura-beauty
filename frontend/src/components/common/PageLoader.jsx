const PageLoader = ({ message = "Cargando..." }) => {
    return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
            <span className="loading loading-spinner loading-lg text-primary" />
            <p className="text-sm text-base-content/70">{message}</p>
        </div>
    )
}

export default PageLoader
