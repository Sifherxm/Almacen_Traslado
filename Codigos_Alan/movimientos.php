<?php
require_once __DIR__ . '/conex.php';

$movimientos = obtenerMovimientos();
$total_movimientos = !empty($movimientos) ? count($movimientos) : 0;
?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <title>Movimientos - ObsidianCode</title>
    <link rel="stylesheet" href="styles.css">
</head>

<body>

<div class="container">

    <!-- Sidebar -->
    <aside class="sidebar">
        <h2 class="logo">ObsidianCode</h2>
        <nav>
            <ul>
                <li onclick="window.location.href='index.php'">Dashboard</li>
                <li class="active">Movimientos</li>
                <li onclick="window.location.href='rfid.php'">RFID</li>
            </ul>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="main">

        <!-- Header -->
        <header class="header">
            <h1>Módulo de Movimientos</h1>
        </header>

        <!-- KPI Card -->
        <section class="cards">
            <div class="card">
                <h3>Total Movimientos</h3>
                <p><?php echo $total_movimientos; ?></p>
            </div>
        </section>

        <!-- Tabla -->
        <section class="table-section">
            <h2>Historial de Movimientos</h2>
            <table>
                <thead>
                    <tr>
                        <th>UID</th>
                        <th>TIPO</th>
                        <th>ALMACÉN</th>
                        <th>FECHA</th>
                        <th>HORA</th>
                    </tr>
                </thead>
                <tbody>

                <?php
                if (!empty($movimientos)) {

                    foreach ($movimientos as $id => $mov) {

                        echo "<tr>";
                        echo "<td>" . ($mov['uid'] ?? 'N/A') . "</td>";
                        echo "<td>" . ($mov['tipo'] ?? 'N/A') . "</td>";
                        echo "<td>" . ($mov['almacen'] ?? 'N/A') . "</td>";
                        echo "<td>" . ($mov['fecha'] ?? 'N/A') . "</td>";
                        echo "<td>" . ($mov['hora'] ?? 'N/A') . "</td>";
                        echo "</tr>";
                    }

                } else {
                    echo "<tr><td colspan='5'>No hay movimientos</td></tr>";
                }
                ?>

                </tbody>
            </table>
        </section>

    </main>
</div>

</body>
</html>