<?php
	/********************************************************
	// Author: André Lichtsteiner
	// Date: 10.04.2014
	// Function: Set config variables dynamic according to
               directory this file is in
	// Modified 07.05.2014 Thomas Bücklers
	// Specify the names of your development and productive folder
	********************************************************/
include 'log4php/Logger.php';
include 'PSI/watchdog/watchdog.php'; 

$devFolder = 'searchbeta';
$prodFolder = 'search';
 

// conf je nach Verzeichnis inst oder instbeta
$directory_array = explode(DIRECTORY_SEPARATOR, __FILE__);
$instdir = $directory_array[count($directory_array)-3];

//prepare the Logger
switch ($instdir) {
	case $devFolder :
		//Baramundi-Server
		$baramundiserver = "wsds06";
		  
		//Usersettings: Beta or live
		$usersettingsdir = "usersettings";
		  
		//OM-Server 
		$omserver = "om";
		$omdbserver = "adomdb01";
		$database = "ntadm2";
		  
		//Domain without \\
		$domain = "PSICH";
		
		//log level
		$loglevel = 'debug';
	break;
	
	
	default:
	    //Baramundi-Server
    	$baramundiserver = "fwsds05";
    	
    	//Usersettings: Beta or live
    	$usersettingsdir = "usersettingsbeta";
    	
    	//OM-Server 
    	$omserver = "fadom01";
    	$omdbserver = "fadom01";
    	$database = "ntadm2";
    	
    	//Domain without \\
    	$domain = "FACTORYXP";
		
		//log level
		$loglevel = 'info';
		
}

// Logger
$configlogger = array(
  'rootLogger' => array(
    'appenders' => array('default'),
    'level' => $loglevel,   // trace, debug, info, warn, error, fatal
  ),
  'appenders' => array(
    'default' => array(
		  'class' => 'LoggerAppenderDailyFile',
			'layout' => array(
				'class' => 'LoggerLayoutPattern',
			'params' => array(
				'conversionPattern' => '%date{d.m.Y H:i:s,u} - %-5level - %message%newline'
				)
			),
			'params' => array(
				'datePattern' => 'Y-m-d',
				'file' => dirname(__FILE__) . '/../log/search-%s.log',        
				'append' => true
			)
		)
  )
);
Logger::configure($configlogger);
$log = Logger::getLogger('SearchLogger');


//Watchdog
$usermappingConfig = array(
	'type'=>'file',
	'property'=>'age',
	'location'=>'data/usermapping.json',
	'threshold'=>'1440'
);

$sensor = Sensor::getSensor('Usermapping');

$sensor->configure($usermappingConfig);

//Hier werden die Zeitfenster eingestellt, zu denen dich die Tests nicht interessieren. 
//Ein Eintrag pro Tag (1 = Montag, 7=Sonntag) oder 0 für täglich. 
//Für Zeitfenster über Mitternacht müssen zwei Einträge gemacht werden.
$exc = array(
	'0 1650 1800'
);

$watchdog = Watchdog::getWatchdog();
//$watchdog->addExceptions($exc);
$watchdog->addSensor($sensor);
/*  */
?>