<?php
include '../config/config.php';

$sourceDbUrl = "https://intranet.psi.ch/people/db/_design/people/_list/wikinames/wikinamemapping";
$targetFilePath = "../data/";
$targetFile = "usermapping.json";
$targetTempFile = "usermappingTemp.json";

$return = -1;

$log->info("mapping file sync started");
	if(!$targetTemp = fopen($targetFilePath.$targetTempFile, "w")){
		$log->error("can't open target temp file");
		//echo($return." : can't open target temp file");
		exit($return." : can't open target temp file");
	}
	
 	if(!$sourceFile = fopen($sourceDbUrl, "r")){
		$log->error("can`t open source file");
		//echo($return." : can`t open source file");
		exit($return." : can`t open source file");
	}
	
	if(!$fileString = stream_get_contents($sourceFile)){
		$log->error("can`t read stream: ".$sourceDbUrl);
		//echo($return." : can`t read stream".$sourceDbUrl);
		exit($return." : can`t read stream: ".$sourceDbUrl);
	}
	
	if(!fwrite($targetTemp, $fileString)){
		$log->error("cannot write to target file");
		//echo($return." : cannot write to target file");
		exit($return." : cannot write to target file");
	}
	fclose($sourceFile);
	fclose($targetTemp);

	if(!rename($targetFilePath.$targetTempFile, $targetFilePath.$targetFile)){
		$log->error("Couldn't rename the file");
		//echo($return." : Couldn't rename the file");
		exit($return." : Couldn't rename the file");
	}
	
	$return = 0;
	$log->info("file successfully updated");
	//echo($return." : file successfully updated");
	exit($return." : file successfully updated");



?>