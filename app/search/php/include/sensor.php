<?
/************************
// Document: sensor.php
// Date of creation: 19-05-2014
// Last Change: 26-05-2014
// Author: T. Bücklers
// Version 1.0
// Function: Can be configured to check files, URLs or folders whether they are too old, too big or don't contain a test string. 
//

Copyright (C) 2014 Paul Scherrer Institut, Switzerland
*************************/

class Sensor {

	public $name = '';
	
 	private $config;
	
	/**
	Constructor, just set the sensor's name
	@param $sensname
	Name of the new sensor
	@return void
	*/
	private function __construct($sensname){	
		$this->name = $sensname;
	}
	
	/**
	Configures the sensor
	 @param $configArray
	 An array with the following parameters:
	 $config = array(
		'type'=>'file',							--> what should be tested? - 'file', 'url', or 'folder'
		'property'=>'age',						--> on which property should be checked? - 'existence', 'size' or 'age'
		'location'=>'data/usermapping.json',	--> where is that thing? path to file/folder or URL
		'threshold'=>'24'						--> above which threshold there should be an alert? - size in MB (file or conent of folder), age in hours (when 'folder' the oldest file will count, or string that should be found in contents.
				);
	@return void
	*/
	public function configure($configArray){
		$this->config = $configArray;
	}
	
	/**
	A static factory method to get a new sensor
	@param $sensorname
	Name of new sensor
	@return
	A new sensor with the given name
	*/
	public static function getSensor($sensorname){
		$sensor = new Sensor($sensorname); 
		return $sensor; 
	}
	
	/**
	Finaly does the configured check
	@return
	(Error number) - (Message)
	example: 0 - check passed
	Error number is 
	0 -> check passed
	-1 -> error occurred 
	*/
	public function check(){
		
		$erno = 0;
		$message = 'check passed';
		
		$location = $this->config['location'];
		$threshold = $this->config['threshold'];
		$property = $this->config['property'];
		$type = $this->config['type'];		
		
		//read the values you need
		switch ($type){
		case "url":
			$existence = false;
			if($content = file_get_contents($location)){
				//date in unix time
					$existence = true;
					$headers = get_headers($location);
					$date = explode(':', $headers[3]);
					$date = $date[1].':'.$date[2].':'.$date[3];
					$date = explode(',', $date);
					$date = $date[1];
				$filetime = strtotime($date);
				$fileage = (time()-$filetime)/3600;
				$filesize = mb_strlen(file_get_contents($location))/1048576;
				if(strlen($threshold) >= 2){
					if(!strpos($content, $threshold)){
						$existence = false;
					}					
				}				
			}
		break;
	
		case "file":
			if($content = file_get_contents($location)){
				$existence = true;
				$filetime = filemtime($location);
				$fileage = (time()-$filetime)/3600;
				$filesize = filesize($location)/1048576;
				if(strlen($threshold) >= 2){
					if(!strpos($content, $threshold)){
						$existence = false;
					}					
				}				
			}else{
				$existence = false;
			}
		break;
		
		case 'folder':
			$size = 0;
			$checkage = 0;
			$existence = false;
			if ($directory = dir($location)){
				while ($entry = $directory->read()){
					if(trim($entry) != '.' && trim($entry) != '..'){
						$existence = true;
						$size += filesize($location.'/'.$entry);
						if($checkage == 0){
							$checkage = filemtime($location.'/'.$entry);
						}else{
							if(filemtime($location.'/'.$entry) < $checkage){
								$checkage = filemtime($location.'/'.$entry);
							}
						}
					}
				} 
				$fileage = (time()-$checkage)/3600;
				$filesize = $size/1048576;
				closedir($directory);
			}		
		break;
		}
		
		//now check the properties accordingly
		switch ($property){
			case "age":
				if($fileage > $threshold){
					$erno = -1;
					$message = 'file too old';
				}			
			break;
			case "size":
				if($filesize > $threshold){
					$erno = -1;
					$message = 'file/folder too big';
				}			
			break;
			case "existence":
				if(!$existence){
					$erno = -1;
					$message = 'file, folder or string in file is not existing';
				}			
			break;		
		}
		return $erno.' - Sensor: '.$this->name.'-'.$message.' ('.$location.')';
	} 
}
?>