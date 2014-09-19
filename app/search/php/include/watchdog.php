<?
include 'sensor.php';

class Watchdog{

	private static $watchdog = null; 
	private static $exceptions = array();
	private static $sensors = array();
	
	private function __construct(){
	}
	
	public static function getWatchdog(){
		if(!isset (static::$watchdog)){
			static::$watchdog = new static;
		}
		return static::$watchdog;
	}
	
 	public static function addException($exceptionString){
		array_push(static::$exceptions, $exceptionString);		
	}
	
	public static function addExceptions($exceptionArray){
		static::$exceptions = $exceptionArray;
	}
	
	public static function addSensor($sensor){
		array_push(static::$sensors, $sensor);
	}

 public function check(){
		$erno = 0;
		$message = 'passed';
		$toCheck = true;
		$debug = $_GET["debug"]? true : false;		
		
		$nowD = date('N', time());
		$nowH = date('H', time());
		$nowM = date('i', time());
		$nowT = $nowH.$nowM;		
		
		foreach(static::$exceptions as $exception){
			$exParts = explode(' ', $exception);
		 	if(($exParts[0] == $nowD || $exParts[0] == '0') && $nowT >= $exParts[1] && $nowT <= $exParts[2]){
				$toCheck = false;
			}
		}
		
		if($toCheck){
			//check all sensors
			foreach(static::$sensors as $item){
				$erno = $erno + trim(substr($item->check(), 0, 2))*1;
				if($debug){echo ($item->check().'<br />');
				}
			}
			
			if($erno != 0){
				$message = ' sensor(s) reported a problem. Use ?debug=true for more information';
			}
		}
		
	return $erno.' '.$message;
	} 	
	
}
?>