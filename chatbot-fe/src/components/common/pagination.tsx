const Pagination = ({ currentPage, totalPages, setCurrentPage, loading }: { currentPage: number, totalPages: number, setCurrentPage: (page: number | ((prev: number) => number)) => void, loading: boolean }) => {
    return (
        <div className="flex justify-center space-x-2 mt-6">
            <button
                onClick={() => setCurrentPage((prev: number) => Math.max(0, prev - 1))}
                disabled={loading || currentPage === 0}
                className="px-4 py-2 border rounded disabled:opacity-50 text-black"
            >
                Previous
            </button>
            <span className="px-4 py-2 text-black">
                Page {currentPage + 1} of {totalPages}
            </span>
            <button
                onClick={() => setCurrentPage((prev: number) => Math.min(totalPages - 1, prev + 1))}
                disabled={loading || currentPage === totalPages - 1}
                className="px-4 py-2 border rounded disabled:opacity-50 text-black"
            >
                Next
            </button>
        </div>
    )
}
export default Pagination