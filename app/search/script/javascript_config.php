<?php

header("Content-Type: text/javascript");

require("../config/config.php");
?>
var omserver = '<?= $omserver?>';
var dbserver = '<?= $omdbserver?>';
var instdir = '<?= $instdir?>';
var domain = '<?= $domain?>';