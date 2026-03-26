<?php
header('Content-Type: application/json');
session_start();

$usersFile = __DIR__ . '/data/users.json';

// Initialize data store if not exists
if (!file_exists(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0777, true);
}
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode(['users' => []]));
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

function getUsers() {
    global $usersFile;
    return json_decode(file_get_contents($usersFile), true)['users'];
}

function saveUsers($users) {
    global $usersFile;
    file_put_contents($usersFile, json_encode(['users' => $users], JSON_PRETTY_PRINT));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($action === 'register') {
        $username = trim($data['username']);
        $password = password_hash($data['password'], PASSWORD_DEFAULT);
        
        $users = getUsers();
        foreach ($users as $user) {
            if ($user['username'] === $username) {
                echo json_encode(['error' => 'Username already exists.']);
                exit;
            }
        }
        
        $users[] = [
            'username' => $username,
            'password' => $password,
            'highlights' => [],
            'default_version' => 'NIV',
            'theme' => 'sepia',
            'font_size' => 1.1,
            'last_read' => null
        ];
        saveUsers($users);
        
        $_SESSION['user'] = $username;
        echo json_encode(['success' => true, 'message' => 'Registration successful.']);
        exit;
    }

    if ($action === 'login') {
        $username = trim($data['username']);
        $password = $data['password'];
        
        $users = getUsers();
        foreach ($users as $user) {
            if ($user['username'] === $username && password_verify($password, $user['password'])) {
                $_SESSION['user'] = $username;
                echo json_encode([
                    'success' => true, 
                    'message' => 'Login successful.', 
                    'highlights' => $user['highlights'], 
                    'default_version' => isset($user['default_version']) ? $user['default_version'] : 'NIV',
                    'theme' => isset($user['theme']) ? $user['theme'] : 'sepia',
                    'font_size' => isset($user['font_size']) ? (float)$user['font_size'] : 1.1,
                    'last_read' => isset($user['last_read']) ? $user['last_read'] : null
                ]);
                exit;
            }
        }
        echo json_encode(['error' => 'Invalid username or password.']);
        exit;
    }

    if ($action === 'save_state') {
        if (!isset($_SESSION['user'])) {
            echo json_encode(['error' => 'Not authenticated.']);
            exit;
        }
        
        $username = $_SESSION['user'];
        $data = json_decode(file_get_contents('php://input'), true);
        
        $users = getUsers();
        foreach ($users as &$user) {
            if ($user['username'] === $username) {
                if (isset($data['highlights'])) $user['highlights'] = $data['highlights'];
                if (isset($data['default_version'])) $user['default_version'] = $data['default_version'];
                if (isset($data['theme'])) $user['theme'] = $data['theme'];
                if (isset($data['font_size'])) $user['font_size'] = (float)$data['font_size'];
                if (isset($data['last_read'])) $user['last_read'] = $data['last_read'];
                saveUsers($users);
                echo json_encode(['success' => true]);
                exit;
            }
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'me') {
        if (isset($_SESSION['user'])) {
            $users = getUsers();
            $highlights = [];
            $defaultVersion = 'NIV';
            $theme = 'sepia';
            $fontSize = 1.1;
            foreach ($users as $user) {
                if ($user['username'] === $_SESSION['user']) {
                    $highlights = $user['highlights'];
                    $defaultVersion = isset($user['default_version']) ? $user['default_version'] : 'NIV';
                    $theme = isset($user['theme']) ? $user['theme'] : 'sepia';
                    $fontSize = isset($user['font_size']) ? (float)$user['font_size'] : 1.1;
                    $lastRead = isset($user['last_read']) ? $user['last_read'] : null;
                }
            }
            echo json_encode([
                'authenticated' => true, 
                'username' => $_SESSION['user'], 
                'highlights' => $highlights, 
                'default_version' => $defaultVersion,
                'theme' => $theme,
                'font_size' => $fontSize,
                'last_read' => $lastRead
            ]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
        exit;
    }

    if ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
        exit;
    }
}
?>
