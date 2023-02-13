export default ({ command }) => ({
    base: command === 'serve' ? '' : './',
    publicDir: 'fake_dir_not_using_public_so_dont_copy_data',
    build: {
        manifest: true,
        outDir: 'public/',
    }
})