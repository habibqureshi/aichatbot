const Error = ({ error }: { error: string }) => {
    return (
        <p className="mt-1 text-sm text-red-600 text-center">
            {error}
        </p>
    )
}

export default Error;