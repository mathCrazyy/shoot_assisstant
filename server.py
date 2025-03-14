from http.server import HTTPServer, SimpleHTTPRequestHandler
import socket
import argparse

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super().end_headers()

def get_ip():
    try:
        # 获取主机名
        hostname = socket.gethostname()
        # 获取IP地址
        ip_address = socket.gethostbyname(hostname)
        return ip_address
    except:
        return "127.0.0.1"

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    ip = get_ip()
    print(f"Server running at http://{ip}:{port}")
    print("You can access the game using any of these URLs:")
    print(f"1. http://{ip}:{port}")
    print(f"2. http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Start a simple HTTP server for the shooting game')
    parser.add_argument('--port', type=int, default=8000, help='Port to run the server on (default: 8000)')
    args = parser.parse_args()
    
    run_server(args.port) 