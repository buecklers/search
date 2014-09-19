<?php
include 'config/config.php';
require 'php/watchdog_log.php';

echo $watchdog->check();
?>