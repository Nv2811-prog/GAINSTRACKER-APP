import http.server, socketserver, functools
D = '/Users/nickivendelbo/Desktop/Gainstracker batman'
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=D)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', 8099), H) as s:
    s.serve_forever()
